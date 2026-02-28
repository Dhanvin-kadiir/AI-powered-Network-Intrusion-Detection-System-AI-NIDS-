"""
AI-NIDS Backend — Unified FastAPI Application
Provides REST + WebSocket endpoints for real-time network intrusion detection.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List, Union, Optional
import asyncio
import csv
import json
import os
import time

import pandas as pd

from nids.inference.scorer import load_model_bundle, score_batch
from nids.features.preprocess import preprocess_flows

# ──────────────────── Configuration ────────────────────
MODEL_PATH = os.getenv("MODEL_PATH", "models/isoforest.joblib")
ALLOW_SCORE = os.getenv("ALLOW_SCORE", "1") == "1"
THRESH = float(os.getenv("ANOMALY_THRESHOLD", "0.5"))

# ──────────────────── App Setup ────────────────────
app = FastAPI(
    title="AI-NIDS Backend",
    description="AI-powered Network Intrusion Detection System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────── Global State ────────────────────
bundle = None  # ML model bundle, loaded on startup

# ──────────────────── Pydantic Models ────────────────────

class Flow(BaseModel):
    """Schema for batch /score endpoint (NSL-KDD-like features)."""
    duration: float = 0.0
    src_bytes: float = 0.0
    dst_bytes: float = 0.0
    count: int = 1
    srv_count: int = 1
    same_srv_rate: float = 1.0
    dst_host_count: int = 1
    dst_host_srv_count: int = 1
    protocol_type: str = "tcp"
    service: str = "unknown"
    flag: str = "SF"


class ScoreRequest(BaseModel):
    records: List[Flow]


class TrainRequest(BaseModel):
    csv_path: str
    out_path: str = "models/isoforest.joblib"


class NetEvent(BaseModel):
    """Schema for real-time /ingest endpoint (raw network events)."""
    src_ip: str
    dst_ip: str
    protocol: str
    bytes_in: int
    bytes_out: int
    flags: Optional[str] = None
    imsi: Optional[str] = None
    cell_id: Optional[str] = None
    rsrp: Optional[float] = None
    rsrq: Optional[float] = None
    sinr: Optional[float] = None
    ts: Optional[float] = None


# ──────────────────── WebSocket Manager ────────────────────

class ConnectionManager:
    """Manages active WebSocket connections for real-time streaming."""

    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: Dict[str, Any]):
        if not self.active:
            return
        payload = json.dumps(message)
        dead: List[WebSocket] = []
        for ws in list(self.active):
            try:
                await ws.send_text(payload)
            except (WebSocketDisconnect, Exception):
                dead.append(ws)
        for d in dead:
            self.disconnect(d)


manager = ConnectionManager()
EVENTS: "asyncio.Queue[Dict[str, Any]]" = asyncio.Queue()

# ──────────────────── Helpers ────────────────────

def event_to_frame(evt: Dict[str, Any]) -> pd.DataFrame:
    """Convert a raw network event dict to a DataFrame with NSL-KDD-like columns."""
    row = {
        "duration": 0.1,
        "src_bytes": evt.get("bytes_out", 0),
        "dst_bytes": evt.get("bytes_in", 0),
        "count": 1,
        "srv_count": 1,
        "same_srv_rate": 1.0,
        "dst_host_count": 1,
        "dst_host_srv_count": 1,
        "protocol_type": evt.get("protocol", "tcp"),
        "service": "other",
        "flag": evt.get("flags", "S"),
    }
    return pd.DataFrame([row])


# ──────────────────── REST Endpoints ────────────────────

@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/status")
def status():
    """Returns model loading status and basic metadata."""
    loaded = bundle is not None
    info = {}
    if loaded:
        info = {
            "features": len(bundle.get("features", [])),
            "score_min": bundle.get("score_min"),
            "score_max": bundle.get("score_max"),
        }
    return {"model_loaded": loaded, **info}


@app.post("/score")
def score(req: ScoreRequest):
    """Score a batch of network flows using the trained Isolation Forest model."""
    if bundle is None:
        raise HTTPException(
            status_code=503,
            detail=f"Model not loaded. Ensure {MODEL_PATH} exists or call /train first.",
        )
    df = pd.DataFrame([r.model_dump() for r in req.records])
    X = preprocess_flows(df)
    scores = score_batch(bundle, X)
    return {"scores": [float(s) for s in scores]}


@app.post("/train")
def train(req: TrainRequest):
    """Train a new Isolation Forest model from a CSV file."""
    from nids.training.train import train_isoforest_from_csv

    if not os.path.exists(req.csv_path):
        raise HTTPException(status_code=400, detail=f"CSV not found: {req.csv_path}")
    os.makedirs(os.path.dirname(req.out_path) or ".", exist_ok=True)
    train_isoforest_from_csv(req.csv_path, req.out_path)

    # Reload the model if it was saved to the default path
    global bundle
    if req.out_path == MODEL_PATH:
        bundle = load_model_bundle(MODEL_PATH)

    return {"saved_to": req.out_path}


# ──────────────────── Real-time Endpoints ────────────────────

@app.post("/ingest")
async def ingest(ev: NetEvent):
    """Ingest a single network event for real-time scoring and streaming."""
    data = ev.model_dump()
    if data.get("ts") is None:
        data["ts"] = time.time()
    await EVENTS.put(data)
    return {"status": "queued"}


@app.get("/recent")
def recent(n: int = Query(500, ge=1, le=5000)):
    """Return the most recent scored events from the log."""
    path = "data/rt_events.csv"
    if not os.path.exists(path):
        return []
    from collections import deque

    rows = deque(maxlen=n)
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            rows.append(line.strip().split(","))
    keys = ["ts", "src_ip", "dst_ip", "protocol", "score", "prediction"]
    return [dict(zip(keys, r)) for r in rows]


@app.websocket("/ws/stream")
async def ws_stream(ws: WebSocket):
    """WebSocket endpoint for real-time event streaming."""
    await manager.connect(ws)
    try:
        while True:
            await asyncio.sleep(60)
    except Exception:
        manager.disconnect(ws)


# ──────────────────── Background Worker ────────────────────

async def predictor_worker():
    """Background task: pulls events from the queue, scores them, and broadcasts."""
    os.makedirs("data", exist_ok=True)
    while True:
        evt = await EVENTS.get()
        try:
            df = event_to_frame(evt)
            X = preprocess_flows(df)
            scores = score_batch(bundle, X)
            score_val = float(scores[0])
            label = "anomaly" if score_val > THRESH else "normal"

            out = {
                "kind": "flow",
                "ts": evt.get("ts", time.time()),
                "ts_ms": int(1000 * evt.get("ts", time.time())),
                "event": {
                    "src": evt.get("src_ip"),
                    "dst": evt.get("dst_ip"),
                    "proto": evt.get("protocol"),
                    "bytes_in": int(evt.get("bytes_in", 0)),
                    "bytes_out": int(evt.get("bytes_out", 0)),
                    "flag": evt.get("flags"),
                },
                "anomaly_score": score_val,
                "prediction": label,
            }
        except Exception as e:
            out = {
                "kind": "error",
                "ts": evt.get("ts", time.time()),
                "ts_ms": int(1000 * evt.get("ts", time.time())),
                "event": evt,
                "anomaly_score": 0.0,
                "prediction": "error",
                "error": str(e),
            }

        # Append to CSV log for /recent
        try:
            with open("data/rt_events.csv", "a", newline="", encoding="utf-8") as f:
                w = csv.writer(f)
                w.writerow([
                    out["ts"],
                    out.get("event", {}).get("src"),
                    out.get("event", {}).get("dst"),
                    out.get("event", {}).get("proto"),
                    out.get("anomaly_score", 0.0),
                    out.get("prediction", "normal"),
                ])
        except Exception:
            pass

        await manager.broadcast(out)


# ──────────────────── Startup ────────────────────

@app.on_event("startup")
async def _startup():
    global bundle
    if os.path.exists(MODEL_PATH):
        bundle = load_model_bundle(MODEL_PATH)
        print(f"[startup] Model loaded from {MODEL_PATH}")
    else:
        print(f"[startup] WARNING: Model not found at {MODEL_PATH}. /score will return 503.")
    asyncio.create_task(predictor_worker())
