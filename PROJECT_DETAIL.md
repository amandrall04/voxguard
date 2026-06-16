# VoxGuard AI - Forensic Voice Authentication Hub

VoxGuard AI is a high-precision digital forensics platform designed to distinguish between authentic human speech and AI-generated synthetic audio (Deepfakes). It utilizes a hybrid analysis model that combines local machine learning heuristics with advanced multimodal reasoning from Gemini 3.1 Pro.

## 🏗️ Architecture Overview

The application follows a modern full-stack architecture:

### 1. Frontend (React + TypeScript + Tailwind CSS)
- **UI/UX**: A "Technical Dashboard" aesthetic designed for precision and clarity.
- **State Management**: React Hooks (`useState`, `useEffect`) for managing analysis results and history.
- **Forensic Engine**: Orchestrates the hybrid analysis by communicating with both the local backend and the Gemini API.
- **Animations**: Powered by `framer-motion` for smooth, professional transitions.

### 2. Backend (Node.js + Express)
- **Local Model**: A supervised classifier trained on real/AI audio (40% weight).
- **API Layer**: Provides endpoints for dataset management, training simulations, and local forensic checks.
- **Vite Middleware**: Integrates the frontend development server into the Express backend.

## 🔬 Forensic Methodology (Hybrid Model)

VoxGuard uses a **40/60 weighted reasoning system**:

### Local ML Model (40%)
- **Supervised Classifier**: Trained on real/AI audio via extracted DSP features.
- **Feature Set**: Spectral centroid/flatness, ZCR, RMS, MFCC variance, pitch variability.

### Gemini 3.1 Pro Reasoning (60%)
- **Biological Signatures**: Looks for mouth clicks, wetness sounds, tongue movements, and irregular breath patterns.
- **Synthetic Artifacts**: Identifies neural "buzzing", phoneme blurring (mushy plosives), and formant drifting.
- **Aggressive Skepticism**: The model is tuned to be highly skeptical, defaulting to "FAKE" if any "uncanny valley" artifacts are detected.

## 📂 Project Structure

```text
├── frontend/             # Frontend Source Code
│   ├── components/       # Reusable UI components (Header, FileUpload, etc.)
│   ├── services/         # API and Gemini orchestration logic
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript interfaces and enums
│   ├── App.tsx           # Main application entry point
│   └── main.tsx          # React DOM mounting
├── backend/              # Backend Source Code
│   └── server.ts         # Express server and ML simulation logic
├── public/               # Static assets
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration with Tailwind v4 plugin
└── package.json          # Project dependencies and scripts
```

## 🚀 Key Technologies
- **Framework**: React 19
- **Styling**: Tailwind CSS v4
- **AI Reasoning**: Google Gemini 3.1 Pro
- **Icons**: Lucide React
- **Server**: Express.js
- **Language**: TypeScript

## 🛡️ Security & Privacy
- **Client-Side API Calls**: Gemini API calls are made directly from the frontend to ensure secure handling of platform-injected API keys.
- **No Data Persistence**: Audio samples are processed in-memory and are not stored permanently on the server.
