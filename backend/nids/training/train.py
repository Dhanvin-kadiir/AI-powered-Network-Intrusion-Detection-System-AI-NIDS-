import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

from nids.features.preprocess import preprocess_flows

def train_isoforest_from_csv(csv_path: str, out_path: str = "models/isoforest.joblib"):
    df = pd.read_csv(csv_path)
    X = preprocess_flows(df)

    model = IsolationForest(
        n_estimators=300,
        max_samples=0.8,
        contamination="auto",
        random_state=42
    )
    model.fit(X)

    # Decision function on training set (higher = more normal)
    train_scores = model.decision_function(X)
    s_min  = float(train_scores.min())
    s_max  = float(train_scores.max())
    s_mean = float(train_scores.mean())
    s_std  = float(train_scores.std() + 1e-9)

    joblib.dump({
        "model": model,
        "features": list(X.columns),
        "score_min": s_min,
        "score_max": s_max,
        "score_mean": s_mean,
        "score_std": s_std
    }, out_path)

    return out_path