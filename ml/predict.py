import json
import os
import sys
from pathlib import Path

import joblib
import numpy as np

from feature_extractor import extract_features

DEFAULT_MODEL_PATH = "ml/model.joblib"


def vectorize(features, feature_order):
    return np.asarray([float(features.get(name, 0.0)) for name in feature_order], dtype=np.float32)


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing audio path"}))
        return 1

    audio_path = sys.argv[1]
    model_path = Path(os.environ.get("MODEL_PATH", DEFAULT_MODEL_PATH))

    if not model_path.exists():
        print(json.dumps({"error": "Model file not found"}))
        return 2

    try:
        payload = joblib.load(model_path)
        model = payload["model"]
        scaler = payload["scaler"]
        feature_order = payload["feature_order"]
    except Exception as exc:
        print(json.dumps({"error": f"Failed to load model: {exc}"}))
        return 3

    try:
        features = extract_features(audio_path)
        vector = vectorize(features, feature_order)
        vector_scaled = scaler.transform([vector])
        prob_fake = float(model.predict_proba(vector_scaled)[0][1])
        score = int(round(prob_fake * 100))
        label = "FAKE" if prob_fake >= 0.5 else "REAL"
    except Exception as exc:
        print(json.dumps({"error": f"Prediction failed: {exc}"}))
        return 4

    print(json.dumps({"label": label, "prob_fake": prob_fake, "score": score}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
