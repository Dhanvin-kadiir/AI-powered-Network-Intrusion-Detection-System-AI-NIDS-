<div align="center">

# 🛡️ AI-Powered Network Intrusion Detection System (AI-NIDS)

**Real-time network traffic analysis and anomaly detection using machine learning**

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.112-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.5-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)

</div>

---

## 📋 Overview

AI-NIDS is a full-stack cybersecurity monitoring tool that captures live network traffic, runs it through an **Isolation Forest** anomaly detection model, and visualizes the results on a real-time dashboard. It acts as a **Digital Twin** for your network's security posture.

### Key Features

- 🔍 **Real-time Anomaly Detection** — Scores every network flow using a trained Isolation Forest model
- 📊 **Live Dashboard** — React-based UI with anomaly timeline, threat gauge, flow table, and incident panel
- 🌐 **WebSocket Streaming** — Push-based real-time updates via `/ws/stream`
- 🎯 **Attack Simulation** — Simulate DDoS, port scan, and data exfiltration attacks
- 📡 **Live Packet Capture** — Capture real network traffic via `tshark` and feed it to the model
- 🛠️ **REST API** — Train models, score flows, and check system status via HTTP endpoints

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    React Dashboard                       │
│  (Anomaly Chart · Threat Gauge · Flow Table · Incidents) │
│                                                          │
│  Polls /score every 1s ──────┐    Listens on /ws/stream  │
└──────────────────────────────┼───────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   FastAPI Backend   │
                    │                     │
                    │  /health  /status   │
                    │  /score   /train    │
                    │  /ingest  /recent   │
                    │  /ws/stream         │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼──────┐ ┌──────▼──────┐ ┌───────▼───────┐
     │  Preprocessor  │ │   Scorer    │ │   Trainer     │
     │ (NSL-KDD feat) │ │(IsoForest)  │ │ (fit + save)  │
     └───────────────┘ └─────────────┘ └───────────────┘
```

---

## 🛠️ Tech Stack

| Layer      | Technology                                   |
|------------|----------------------------------------------|
| Frontend   | React 18 · TypeScript · Vite · Tailwind CSS  |
| Backend    | Python · FastAPI · Uvicorn · WebSockets       |
| ML Engine  | scikit-learn (Isolation Forest) · pandas      |
| Capture    | tshark (Wireshark CLI)                        |

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** and **npm**
- **tshark** (optional, for live network capture) — Install via [Wireshark](https://www.wireshark.org/download.html)

### 1. Clone the Repository

```bash
git clone https://github.com/Dhanvin-kadiir/AI-powered-Network-Intrusion-Detection-System-AI-NIDS-.git
cd AI-powered-Network-Intrusion-Detection-System-AI-NIDS-
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Train the Model

Download the [NSL-KDD dataset](https://www.unb.ca/cic/datasets/nsl.html) and place `KDDTrain+.csv` in `backend/data/NSL-KDD/`.

```bash
# Start the server first
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# In another terminal, trigger training via the API
curl -X POST http://127.0.0.1:8000/train \
  -H "Content-Type: application/json" \
  -d '{"csv_path": "data/NSL-KDD/KDDTrain+.csv"}'
```

The trained model will be saved to `backend/models/isoforest.joblib`.

### 4. Start the Backend

```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at `http://127.0.0.1:8000`. Visit `http://127.0.0.1:8000/docs` for interactive Swagger documentation.

### 5. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser to **<http://localhost:5173>** to see the dashboard.

---

## 📡 API Endpoints

| Method | Endpoint       | Description                                  |
|--------|----------------|----------------------------------------------|
| GET    | `/health`      | Health check                                 |
| GET    | `/status`      | Model loading status and metadata            |
| POST   | `/score`       | Score a batch of network flows               |
| POST   | `/train`       | Train a new Isolation Forest model from CSV  |
| POST   | `/ingest`      | Ingest a single real-time network event      |
| GET    | `/recent`      | Retrieve recent scored events                |
| WS     | `/ws/stream`   | WebSocket stream of real-time scored events  |

### Example: Score a Flow

```bash
curl -X POST http://127.0.0.1:8000/score \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      {
        "duration": 0,
        "src_bytes": 500,
        "dst_bytes": 200,
        "count": 3,
        "srv_count": 3,
        "same_srv_rate": 0.7,
        "dst_host_count": 20,
        "dst_host_srv_count": 5,
        "protocol_type": "tcp",
        "service": "unknown",
        "flag": "SF"
      }
    ]
  }'
```

**Response:**

```json
{
  "scores": [0.42]
}
```

A score closer to **1.0** indicates a higher likelihood of anomalous (malicious) traffic.

---

## 🧪 Live Network Capture (Optional)

To capture real network traffic and feed it to the model:

```bash
cd backend
python live_capture_flows.py
```

> **Note:** Requires `tshark` in PATH and admin/root privileges for network capture.

---

## 📁 Project Structure

```
AI-NIDS/
├── backend/
│   ├── app/
│   │   └── main.py              # Unified FastAPI application
│   ├── nids/
│   │   ├── features/
│   │   │   └── preprocess.py    # Feature preprocessing (NSL-KDD)
│   │   ├── inference/
│   │   │   └── scorer.py        # Model loading and scoring
│   │   └── training/
│   │       └── train.py         # Isolation Forest training
│   ├── live_capture_flows.py    # tshark-based packet capture
│   ├── simulate.py              # Traffic simulator for testing
│   ├── requirements.txt
│   ├── models/                  # Trained models (gitignored)
│   └── data/                    # Datasets and logs (gitignored)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx    # Main dashboard layout
│   │   │   ├── AnomalyChart.tsx # Anomaly detection timeline
│   │   │   ├── ControlPanel.tsx # Threshold and attack simulation
│   │   │   ├── FlowTable.tsx    # Recent network flows table
│   │   │   ├── IncidentPanel.tsx# Active incidents panel
│   │   │   ├── MetricsPanel.tsx # System metrics display
│   │   │   └── ThreatGauge.tsx  # Threat level gauge
│   │   ├── context/
│   │   │   └── NIDSContext.tsx  # Global state management
│   │   └── lib/
│   │       └── api.ts           # Backend API client
│   ├── .env.example
│   ├── package.json
│   └── index.html
├── .gitignore
└── README.md
```

---

## 🤖 Machine Learning Model

- **Algorithm:** Isolation Forest (unsupervised anomaly detection)
- **Dataset:** NSL-KDD (improved version of KDD Cup 1999)
- **Features:** 8 numeric + 3 categorical (one-hot encoded)
- **Output:** Anomaly score between 0.0 (normal) and 1.0 (anomalous)

| Feature              | Description                          |
|----------------------|--------------------------------------|
| `duration`           | Connection duration (seconds)        |
| `src_bytes`          | Bytes sent by source                 |
| `dst_bytes`          | Bytes sent by destination            |
| `count`              | Connection count in time window      |
| `srv_count`          | Same-service connection count        |
| `same_srv_rate`      | Rate of same-service connections     |
| `dst_host_count`     | Unique destination host count        |
| `dst_host_srv_count` | Destination host same-service count  |
| `protocol_type`      | TCP, UDP, or ICMP                    |
| `service`            | Network service type                 |
| `flag`               | Connection status flag               |

---

## 📄 License

This project is for educational and research purposes.

---

<div align="center">

**Built with ❤️ by [Dhanvin Kadiir](https://github.com/Dhanvin-kadiir)**

</div>
