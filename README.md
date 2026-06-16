<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c4a9da7e-fc28-4008-8f3b-74afea28f744

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
