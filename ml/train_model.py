import argparse
import json
from pathlib import Path
from typing import Dict, List, Tuple

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from feature_extractor import extract_features

AUDIO_EXTS = {".wav", ".mp3", ".m4a", ".flac", ".ogg"}
FEATURE_ORDER = [
    "spectralCentroid",
    "spectralCentroidStd",
    "zeroCrossingRate",
    "zeroCrossingRateStd",
    "rms",
    "rmsStd",
    "spectralFlatness",
    "spectralFlatnessStd",
    "mfccMean",
    "mfccVariance",
    "pitchStd",
    "energyVariance",
]


def collect_audio_files(dataset_dir: Path) -> List[Tuple[Path, int]]:
    samples: List[Tuple[Path, int]] = []
    for label_name, label_value in ("real", 0), ("ai", 1):
        label_dir = dataset_dir / label_name
        if not label_dir.exists():
            continue
        for path in label_dir.rglob("*"):
            if path.suffix.lower() in AUDIO_EXTS:
                samples.append((path, label_value))
    return samples


def vectorize_features(raw_features: Dict[str, float]) -> List[float]:
    return [float(raw_features.get(name, 0.0)) for name in FEATURE_ORDER]


def train_model(dataset_dir: Path, model_path: Path, metrics_path: Path) -> Dict[str, object]:
    samples = collect_audio_files(dataset_dir)
    if len(samples) < 4:
        raise ValueError("Not enough audio samples found. Add real/ai audio files to dataset/.")

    features: List[List[float]] = []
    labels: List[int] = []
    errors: List[str] = []

    for file_path, label in samples:
        try:
            raw = extract_features(str(file_path))
            features.append(vectorize_features(raw))
            labels.append(label)
        except Exception as exc:
            errors.append(f"{file_path.name}: {exc}")

    if len(set(labels)) < 2:
        raise ValueError("Need at least one real and one ai audio file to train.")

    X = np.asarray(features, dtype=np.float32)
    y = np.asarray(labels, dtype=np.int64)

    stratify = y if len(y) >= 6 else None
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=stratify
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)

    model = LogisticRegression(max_iter=1000, class_weight="balanced")
    model.fit(X_train_scaled, y_train)

    val_probs = model.predict_proba(X_val_scaled)[:, 1]
    val_preds = (val_probs >= 0.5).astype(int)

    accuracy = float(accuracy_score(y_val, val_preds))
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_val, val_preds, average="binary", zero_division=0
    )

    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": model,
            "scaler": scaler,
            "feature_order": FEATURE_ORDER,
        },
        model_path,
    )

    metrics = {
        "samples": len(samples),
        "train_samples": len(y_train),
        "val_samples": len(y_val),
        "accuracy": accuracy,
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "errors": errors,
    }

    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    metrics_path.write_text(json.dumps(metrics, indent=2))

    return metrics


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--metrics", required=True)
    args = parser.parse_args()

    try:
        metrics = train_model(Path(args.dataset), Path(args.model), Path(args.metrics))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        return 1

    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
