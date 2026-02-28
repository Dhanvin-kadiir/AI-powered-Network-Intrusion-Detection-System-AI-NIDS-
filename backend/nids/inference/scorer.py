import joblib
import numpy as np
import pandas as pd

def load_model_bundle(path: str):
    return joblib.load(path)

def score_batch(bundle, df: pd.DataFrame) -> np.ndarray:
    model = bundle["model"]
    cols  = bundle["features"]
    X = df.reindex(columns=cols, fill_value=0)

    raw = model.decision_function(X)  # higher = more normal

    # Normalize using training-set distribution (robust for single records)
    s_min = bundle.get("score_min", float(raw.min()))
    s_max = bundle.get("score_max", float(raw.max()))

    denom = (s_max - s_min) if (s_max - s_min) > 1e-9 else 1.0
    anomaly = (s_max - raw) / denom  # map to 0..1 (1 = most suspicious)
    anomaly = np.clip(anomaly, 0.0, 1.0)
    return anomaly