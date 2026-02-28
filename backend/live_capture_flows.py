# live_capture_flows.py
# Capture packets via tshark, aggregate into short flows, and POST to /ingest (batch).
# Run your terminal as Administrator on Windows (Npcap) or with sudo on Linux.
# Requires: tshark in PATH. Set IFACE via tshark -D.

import os
import time
import json
import httpx
import threading
import subprocess
from collections import defaultdict

# ================== CONFIG (env-overridable) ==================
BACKEND         = os.getenv("BACKEND", "http://127.0.0.1:8000")
IFACE           = os.getenv("IFACE", "4")      # index or interface name from tshark -D
WINDOW_SEC      = float(os.getenv("WINDOW_SEC", "5"))  # length of aggregation window
FLUSH_INTERVAL  = float(os.getenv("FLUSH_INTERVAL", "2"))
MAX_FLOWS_FLUSH = int(os.getenv("MAX_FLOWS_FLUSH", "5000"))
POST_TIMEOUT    = float(os.getenv("POST_TIMEOUT", "3"))
# ===============================================================

def now() -> float:
    return time.time()

# ---- Mapping helpers (NSL-KDD-ish) ----
def map_protocol(proto_str: str) -> str:
    if not proto_str:
        return "other"
    p = proto_str.strip().lower()
    if p in ("tcp", "udp", "icmp"):
        return p
    # Sometimes we get numeric IP proto instead of name
    if p in ("6",):  return "tcp"
    if p in ("17",): return "udp"
    if p in ("1",):  return "icmp"
    return "other"

def map_service(dst_port):
    try:
        p = int(dst_port)
    except Exception:
        return "other"
    if p in (80, 8080, 8000): return "http"
    if p in (443, 8443):      return "https"
    if p in (53,):            return "domain"   # NSL name for DNS
    if p in (22,):            return "ssh"
    if p in (25, 465, 587):   return "smtp"
    if p in (110, 995):       return "pop3"
    if p in (143, 993):       return "imap4"
    return "other"

def map_flag(tcp_flags):
    """
    Accepts either a hex-like string ('0x12') or a letters summary ('SAF...').
    Returns NSL-style coarse categories: SF, S0, RSTR, OTH.
    """
    s = (tcp_flags or "").strip()
    # letter summary path (common on Windows with _ws.col.)
    letters = set([c for c in s if c.isalpha()])
    if letters:
        SYN = 'S' in letters
        ACK = 'A' in letters
        RST = 'R' in letters
        FIN = 'F' in letters
        if SYN and ACK:  return "SF"
        if SYN and not ACK: return "S0"
        if RST:          return "RSTR"
        if FIN:          return "SF"
        return "OTH"
    # hex-ish path
    try:
        f = int(s, 16)
    except Exception:
        return "OTH"
    SYN = 0x02; ACK = 0x10; RST = 0x04; FIN = 0x01
    if (f & SYN) and (f & ACK): return "SF"
    if (f & SYN) and not (f & ACK): return "S0"
    if (f & RST): return "RSTR"
    if (f & FIN): return "SF"
    return "OTH"

def pick_port(tcp_p, udp_p):
    try:
        if tcp_p: return int(tcp_p)
    except Exception:
        pass
    try:
        if udp_p: return int(udp_p)
    except Exception:
        pass
    return 0

# tshark output fields (one line per packet)
# Format: time|ip.src|tcp.sport|udp.sport|ip.dst|tcp.dport|udp.dport|proto(_ws.col.Protocol)|ip.len|tcp.flags
TSHARK_CMD = [
    "tshark", "-i", str(IFACE), "-l",            # -l = line-buffered
    "-T", "fields",
    "-E", "separator=|",
    "-E", "quote=d",
    "-E", "header=n",
    "-e", "frame.time_epoch",
    "-e", "ip.src",
    "-e", "tcp.srcport",
    "-e", "udp.srcport",
    "-e", "ip.dst",
    "-e", "tcp.dstport",
    "-e", "udp.dstport",
    "-e", "_ws.col.Protocol",
    "-e", "ip.len",
    "-e", "tcp.flags",
]

# ------------- Aggregation state (per window) -------------
# flows[(src, sport, dst, dport, proto)] = {
#   "first_ts":..., "last_ts":..., "bytes": int, "pkts": int, "last_flags": str
# }
flows = {}
flows_lock = threading.Lock()

# to compute host/service counts for the window
# global sets recomputed per flush snapshot
# ----------------------------------------------------------

def parse_line(line: str):
    # Expected 10 parts
    parts = [p.strip('"') for p in line.strip().split("|")]
    if len(parts) != 10:
        return None, None
    ts_s, src, tcp_sp, udp_sp, dst, tcp_dp, udp_dp, proto, iplen_s, flags = parts
    try:
        ts = float(ts_s) if ts_s else now()
    except Exception:
        ts = now()

    sport = pick_port(tcp_sp, udp_sp)
    dport = pick_port(tcp_dp, udp_dp)
    proto = map_protocol(proto)
    try:
        iplen = int(iplen_s) if iplen_s else 0
    except Exception:
        iplen = 0

    k = (src or "0.0.0.0", sport, dst or "0.0.0.0", dport, proto)
    pkt = {
        "ts": ts,
        "src": src or "0.0.0.0",
        "dst": dst or "0.0.0.0",
        "sport": sport,
        "dport": dport,
        "proto": proto,
        "iplen": max(0, iplen),
        "flags": flags or "",
    }
    return k, pkt

def add_packet(k, pkt):
    with flows_lock:
        f = flows.get(k)
        if f is None:
            f = {"first_ts": pkt["ts"], "last_ts": pkt["ts"], "bytes": 0, "pkts": 0, "last_flags": ""}
            flows[k] = f
        f["last_ts"] = pkt["ts"]
        f["bytes"]  += pkt["iplen"]
        f["pkts"]   += 1
        if pkt["flags"]:
            f["last_flags"] = pkt["flags"]

def reverse_key(k):
    src, sport, dst, dport, proto = k
    return (dst, dport, src, sport, proto)

def build_flow_features(snapshot, k, f, window_sets):
    """
    Map aggregated flow to the 11 NSL-KDD-ish features the model expects.
    window_sets: dict with keys 'dst_ips' (set), 'dst_ip_srv' (set), 'service_count' (dict)
    """
    src, sport, dst, dport, proto = k
    rk = reverse_key(k)
    rf = snapshot.get(rk)

    bytes_out = f["bytes"]
    bytes_in  = rf["bytes"] if rf else 0

    duration = max(0.0, f["last_ts"] - f["first_ts"])
    service  = map_service(dport)
    flag     = map_flag(f.get("last_flags", ""))

    dst_host_count     = max(1, len(window_sets["dst_ips"]))
    dst_host_srv_count = max(1, len(window_sets["dst_ip_srv"]))
    srv_count          = max(1, window_sets["service_count"].get(service, 1))
    same_srv_rate      = float(srv_count) / float(dst_host_count)

    # Construct model-ready flow dict
    return {
        "duration": duration,
        "src_bytes": float(bytes_out),
        "dst_bytes": float(bytes_in),
        "count": int(f["pkts"]),
        "srv_count": int(srv_count),
        "same_srv_rate": float(same_srv_rate),
        "dst_host_count": int(dst_host_count),
        "dst_host_srv_count": int(dst_host_srv_count),
        "protocol_type": proto,
        "service": service,
        "flag": flag,
    }

def flush_and_post():
    # Take snapshot & reset window safely
    with flows_lock:
        snapshot = flows
        globals()["flows"] = {}

    if not snapshot:
        return

    # Window-level sets for counts
    dst_ips     = set()
    dst_ip_srv  = set()
    service_cnt = defaultdict(int)

    # First pass: populate sets
    for (src, sport, dst, dport, proto), f in snapshot.items():
        dst_ips.add(dst)
        srv = map_service(dport)
        dst_ip_srv.add((dst, srv))
        service_cnt[srv] += 1

    window_sets = {
        "dst_ips": dst_ips,
        "dst_ip_srv": dst_ip_srv,
        "service_count": service_cnt,
    }

    # Second pass: build model features and batch
    flows_out = []
    seen = set()
    for k, f in snapshot.items():
        if k in seen:
            continue
        rk = reverse_key(k)
        if rk in snapshot:
            seen.add(rk)
        seen.add(k)

        features = build_flow_features(snapshot, k, f, window_sets)
        flows_out.append(features)
        if len(flows_out) >= MAX_FLOWS_FLUSH:
            break

    if not flows_out:
        return

    payload = {"timestamp": int(now()), "flows": flows_out}

    try:
        with httpx.Client(timeout=POST_TIMEOUT) as client:
            r = client.post(f"{BACKEND}/ingest", json=payload)
            print(f"[POST] {r.status_code} {r.text[:120]}")
    except Exception as e:
        print("[POST ERROR]", e)

def flusher():
    last_flush = now()
    while True:
        time.sleep(FLUSH_INTERVAL)
        if now() - last_flush >= WINDOW_SEC:
            flush_and_post()
            last_flush = now()

def main():
    print(f"[flows] capturing on IFACE={IFACE}  window={WINDOW_SEC}s  flush={FLUSH_INTERVAL}s")
    t = threading.Thread(target=flusher, daemon=True)
    t.start()

    try:
        proc = subprocess.Popen(
            TSHARK_CMD,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="ignore"
        )
    except FileNotFoundError:
        print("tshark not found. Install Wireshark and ensure tshark is in PATH.")
        return
    except Exception as e:
        print("Failed to start tshark:", e)
        return

    try:
        for line in proc.stdout:
            if not line or not line.strip():
                continue
            k, pkt = parse_line(line)
            if k is None:
                continue
            add_packet(k, pkt)
    except KeyboardInterrupt:
        pass
    finally:
        try:
            proc.terminate()
        except Exception:
            pass
        flush_and_post()
        print("\n[flows] stopped.")

if __name__ == "__main__":
    main()