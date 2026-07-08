# Audio → Vector Process (current implementation + recommended real pipeline)

Summary
-------
This document describes how the repository currently converts an uploaded audio file into numeric values used for jitter and other forensic markers, and then outlines a recommended, production-ready pipeline to compute real feature vectors (including jitter metrics).

Current implementation (what the code actually does)
-----------------------------------------------
- The API endpoint `/api/ml-analyze` in [backend/server.ts](backend/server.ts#L1-L200) accepts uploads (it expects `base64Audio` in the body) but does not decode or analyze the audio contents in a deterministic way.
- The server calls `analyzeAudio("mock_path")` from [backend/services/audioProcessor.ts](backend/services/audioProcessor.ts#L1-L120). That module tries to run `ffprobe` only to gather file metadata and otherwise returns simulated results.

Key points from the code
- `analyzeAudio()` uses `ffmpeg.ffprobe()` to read metadata if the file exists; otherwise it falls back to `simulateAnalysis()` which fabricates feature values: `spectralCentroid`, `zeroCrossingRate`, `rms`, and `dynamicRange`. See [backend/services/audioProcessor.ts](backend/services/audioProcessor.ts#L1-L120).
- The server maps those simulated values into forensic markers and returns `jitterData` produced by
  - a random array: `Array.from({ length: 10 }).map((_, i) => ({ time: i, jitter: Math.random() * 0.1 }))` in [backend/server.ts](backend/server.ts#L60-L130).

Conclusion about current behavior
- There is no deterministic audio → feature vector conversion implemented. The project currently simulates features and jitter values for demo/UI purposes.

Recommended real pipeline (step-by-step)
--------------------------------------
1. Decode and normalize audio
   - Decode the uploaded audio into a floating-point PCM buffer (mono) and resample to a standard rate (e.g. 16 kHz or 22.05 kHz).
   - Convert to 32-bit float, normalize amplitude (peak or RMS normalization), and optionally apply a pre-emphasis filter.

2. Voice activity detection (optional but recommended)
   - Run VAD to remove silence/non-speech frames to focus feature extraction on voiced regions.

3. Frame and window
   - Split signal into overlapping frames (typical: 20–40 ms frames with 10 ms hop).
   - Apply a window (Hamming/Hann) to each frame.

4. Low-level spectral features (per-frame)
   - Compute short-time Fourier transform (STFT) magnitude.
   - Per-frame features: spectral centroid, spectral flux, spectral rolloff, zero-crossing rate (ZCR), RMS energy.

5. Cepstral features
   - Compute MFCCs per-frame (e.g., 13 coefficients + delta + delta-delta) and aggregate (mean, std) across frames to form global vectors.

6. Pitch / period extraction (for jitter)
   - Estimate fundamental frequency (F0) and extract consecutive pitch period values T_i (in seconds) only for voiced frames using an algorithm such as YIN, autocorrelation, or `parselmouth`/Praat.

7. Jitter metrics (computed from pitch periods)
   - Local jitter: average absolute difference between consecutive periods:

  $$\text{Jitter}_{\text{local}} = \frac{1}{N-1}\sum_{i=1}^{N-1} \frac{|T_i - T_{i+1}|}{\bar{T}}$$

  where $T_i$ are consecutive pitch periods and $\bar{T}$ is the mean period.

  - Relative Average Perturbation (RAP): average absolute deviation of a period from the mean of it and its two neighbors (window of 3), normalized by mean period.

  - Additional variations: ppq5 (5-point), ddp (derivative of differences), and shimmer (amplitude perturbation) computed similarly on amplitudes.

8. Aggregate into a feature vector
   - Combine spectral statistics (mean/std of MFCCs, centroid, ZCR, RMS), jitter metrics, shimmer, and other descriptors into a single numeric vector for ML/forensic scoring.

9. (Optional) Time-series vectors
   - Keep the per-frame MFCC or spectral embeddings if the model expects sequences (RNN/Transformer). Otherwise summarize by statistics.

Implementation suggestions and libraries
-------------------------------------
- Python (recommended for research/ML): use `librosa` (STFT, MFCC, ZCR, RMS), `parselmouth` (Praat bindings) or `pyworld`/`crepe` for robust pitch, and `numpy`/`scipy` for framing. Example libs: `librosa`, `praatio`/`parselmouth`, `pyAudioAnalysis`.
- Node.js: use `fluent-ffmpeg` to decode, then `meyda` for features or call a Python microservice for more advanced pitch/jitter measures.
- For jitter/pitch: use `parselmouth` (Praat) or robust pitch extraction (YIN). Praat's formulas are well-tested for jitter/shimmer.

Quick prototype (Python sketch)
```python
import librosa
import numpy as np

y, sr = librosa.load(path, sr=16000, mono=True)
frames = librosa.util.frame(y, frame_length=int(0.03*sr), hop_length=int(0.01*sr)).T
# Compute MFCCs
mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
# Pitch (example using librosa's piptrack or use parselmouth for better F0)
pitches, mags = librosa.piptrack(y=y, sr=sr)

# For jitter use parselmouth/Praat to get periods T_i then compute formulas above
```

Where to change the repository
------------------------------
- The current simulated implementation lives in [backend/services/audioProcessor.ts](backend/services/audioProcessor.ts#L1-L120) and the API wrapper in [backend/server.ts](backend/server.ts#L1-L200). Replace `simulateAnalysis()` with a real analysis call (either spawn a Python microservice or implement feature extraction in Node) and return a deterministic `features` object and `jitterData` array.

Testing and validation
----------------------
- Validate pitch extraction on known voiced audio and check that jitter metrics are stable across multiple recordings of the same speaker.
- Compare outputs against Praat or `parselmouth` as the ground truth for jitter/shimmer metrics.

Next steps I can take for you
----------------------------
- Implement a Python microservice that computes MFCCs, pitch, and jitter (using `parselmouth`) and integrate it with `backend/server.ts`.
- Or implement a Node-based feature extractor (using `ffmpeg` + `meyda`) and wire it into `analyzeAudio()`.

If you want, I can implement a minimal working extractor and add server integration — tell me which language (Python or Node) you prefer.
