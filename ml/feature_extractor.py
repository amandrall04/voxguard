import json
import sys
from typing import Dict

import librosa
import numpy as np


TARGET_SR = 16000


def safe_variance(values: np.ndarray) -> float:
    if values.size == 0:
        return 0.0
    return float(np.var(values))


def safe_std(values: np.ndarray) -> float:
    if values.size == 0:
        return 0.0
    return float(np.std(values))


def extract_features(path: str) -> Dict[str, float]:
    audio, sr = librosa.load(path, sr=TARGET_SR, mono=True)
    if audio.size == 0:
        raise ValueError("No audio data extracted")

    duration_sec = float(librosa.get_duration(y=audio, sr=sr))

    spectral_centroid = librosa.feature.spectral_centroid(y=audio, sr=sr)
    spectral_flatness = librosa.feature.spectral_flatness(y=audio)
    zcr = librosa.feature.zero_crossing_rate(y=audio)
    rms = librosa.feature.rms(y=audio)

    mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13)
    mfcc_mean = float(np.mean(mfcc))
    mfcc_variance = safe_variance(mfcc)

    f0 = librosa.yin(audio, fmin=50, fmax=500, sr=sr)
    f0 = f0[np.isfinite(f0)]
    pitch_std = safe_std(f0)

    energy_variance = safe_variance(rms)

    return {
        "spectralCentroid": float(np.mean(spectral_centroid)),
        "spectralCentroidStd": float(np.std(spectral_centroid)),
        "zeroCrossingRate": float(np.mean(zcr)),
        "zeroCrossingRateStd": float(np.std(zcr)),
        "rms": float(np.mean(rms)),
        "rmsStd": float(np.std(rms)),
        "spectralFlatness": float(np.mean(spectral_flatness)),
        "spectralFlatnessStd": float(np.std(spectral_flatness)),
        "mfccMean": mfcc_mean,
        "mfccVariance": mfcc_variance,
        "pitchStd": pitch_std,
        "energyVariance": energy_variance,
        "durationSec": duration_sec,
        "sampleRate": float(sr),
    }


def main() -> int:
    if len(sys.argv) < 2:
        print("{}", end="")
        return 1

    path = sys.argv[1]
    try:
        features = extract_features(path)
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": str(exc)}))
        return 2

    print(json.dumps(features))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
