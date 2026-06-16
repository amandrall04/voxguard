

# Run and deploy your AI Studio app


## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Train the Local Model

1. Place audio files into `dataset/real` and `dataset/ai` (WAV/MP3/M4A/FLAC/OGG).
2. Train the classifier:
   `python ml/train_model.py --dataset dataset --model ml/model.joblib --metrics ml/model_metrics.json`
3. Start the app as usual. The backend will use the trained model when present.
