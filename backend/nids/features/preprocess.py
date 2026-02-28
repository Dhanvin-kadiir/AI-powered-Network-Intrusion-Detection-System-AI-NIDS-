
import pandas as pd

NUMERIC = [
    "duration","src_bytes","dst_bytes","count","srv_count",
    "same_srv_rate","dst_host_count","dst_host_srv_count"
]
CATEGORICAL = ["protocol_type","service","flag"]

def preprocess_flows(df: pd.DataFrame) -> pd.DataFrame:
    cols = set(NUMERIC + CATEGORICAL)
    df = df[[c for c in df.columns if c in cols]].copy()
    for c in NUMERIC:
        if c not in df: df[c] = 0
    for c in CATEGORICAL:
        if c not in df: df[c] = "unknown"
    df[NUMERIC] = df[NUMERIC].fillna(0)
    df = pd.get_dummies(df, columns=CATEGORICAL, drop_first=True)
    return df
