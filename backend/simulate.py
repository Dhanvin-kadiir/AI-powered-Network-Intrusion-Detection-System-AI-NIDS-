import asyncio, time, random
import httpx

PROTO = ["tcp","udp","icmp"]
FLAGS = [None, "S", "SA", "PA", "FA"]
CELLS = ["eNB-1123","gNB-77A2","gNB-77B4"]

def rand_ip(a=10, b=0):
    return f"{a}.{b}.{random.randint(0,255)}.{random.randint(1,254)}"

def rand_evt():
    return {
        "src_ip": rand_ip(10, random.randint(0,255)),
        "dst_ip": rand_ip(172, random.randint(16,31)),
        "protocol": random.choice(PROTO),
        "bytes_in": random.randint(100, 20000),
        "bytes_out": random.randint(50, 15000),
        "flags": random.choice(FLAGS),
        "imsi": f"40401{random.randint(10*9,10*10-1)}",
        "cell_id": random.choice(CELLS),
        "rsrp": round(random.uniform(-105, -75), 1),
        "rsrq": round(random.uniform(-20, -3), 1),
        "sinr": round(random.uniform(-5, 25), 1),
        "ts": time.time()
    }

async def main():
    base = "http://localhost:8000"
    async with httpx.AsyncClient() as client:
        while True:
            ev = rand_evt()
            try:
                await client.post(f"{base}/ingest", json=ev, timeout=5)
                print("sent", ev)
            except Exception as e:
                print("post error:", e)
            await asyncio.sleep(0.15)  # ~6-7 events/sec

if __name__ == "__main__":
    asyncio.run(main())