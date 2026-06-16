# VoxGuard AI: Complete Technical Documentation & Project Roadmap

This document provides a comprehensive breakdown of the VoxGuard AI Voice Forensic platform, including file-by-file explanations and a detailed week-wise development history.

---

## 1. Project Overview
VoxGuard AI is a hybrid forensic tool designed to detect cloned or synthetic voices. It combines a trained local model (40% weight) with deep generative AI reasoning via Google Gemini (60% weight) to provide a high-confidence verdict on audio authenticity.

---

## 2. File-by-File Documentation

### 📁 Backend (Server-Side)
*   **`backend/server.ts`**: The core of the backend. It uses Express to serve API routes. It handles:
    *   Audio file uploads via `Multer`.
    *   The `/api/ml-analyze` route which processes audio and returns "local" forensic markers.
    *   The `/api/dataset` and `/api/train` endpoints for the Data Science Lab simulation.
    *   Production-ready routing to serve the frontend SPA.
*   **`backend/services/audioProcessor.ts`**: Contains the logic for signal analysis. Currently implements a simulation layer that calculates "mock" spectral centroids and zero-crossing rates to ensure system reliability across different deployment environments.

### 📁 Frontend (Client-Side)
*   **`frontend/App.tsx`**: The main entry point of the React application. It manages the global state (history, current results) and navigation between the **Scan** and **History** tabs. It features an inline results dashboard for professional analysis.
*   **`frontend/services/analysisService.ts`**: The "Intelligence Coordinator." It performs two primary steps:
    1. Calls the local backend for raw signal metrics.
    2. Sends the audio and metrics to the Gemini AI using the `GoogleGenAI` SDK.
    3. Implements the **60/40 weighting logic** where the AI's descriptive reasoning is prioritized.
*   **`frontend/components/FileUpload.tsx`**: A reusable, drag-and-drop component that handles user audio input. It includes animations to indicate the "Analyzing" state.
*   **`frontend/components/Header.tsx`**: Manages top-level navigation and displays the real-time status of the backend connection.
*   **`frontend/hooks/useBackendStatus.ts`**: A custom React hook that polls the `/api/health` endpoint to ensure the forensic engine is online.
*   **`frontend/types/index.ts`**: Centralized TypeScript definitions for Forensic Markers, Spectral Data, and Application State.
*   **`frontend/index.css`**: Contains the global Tailwind CSS configuration and the custom "Neon-Brutalist" forensic interface styles, including scanline animations.

### 📁 Configuration & Metadata
*   **`metadata.json`**: Sets the application name (VoxGuard AI) and description.
*   **.env.example**: Provides a template for required secrets (like the `GEMINI_API_KEY`).
*   **package.json**: Manages all dependencies (Express, React, Lucide-React, GoogleGenAI).

### 📁 Local ML (Training + Inference)
*   **`ml/train_model.py`**: Trains a supervised classifier using audio in `dataset/real` and `dataset/ai`.
*   **`ml/predict.py`**: Loads the trained model and returns a local confidence score.
*   **`ml/model.joblib`**: Saved model artifact (generated after training).

---

## 3. Detailed Week-Wise Development History (Mon-Wed Schedule)

### Week 1: Infrastructure & The Signal (April 6 – April 8)
*   **Objective:** Establishing the foundation.
*   **Key Tasks:** 
    *   Scaffolded the Express/React environment.
    *   Implemented the core API Heartbeat protocol (`/api/health`) and request/response lifecycle.
    *   Developed the "Smart Simulation Layer" to generate realistic forensic metrics (fingerprinting) without requiring external server software.
*   **Outcome:** A functional system that could accept an audio file and return a technical forensic receipt.

### Week 2: Dataset Logic & Backend Inventory (April 13 – April 15)
*   **Objective:** Building the management logic for forensic datasets.
*   **Notes:** No work performed on April 14 (Public Holiday).
*   **Key Tasks:** 
    *   Defined the backend data structures for storing and comparing voice fingerprints.
    *   Implemented backend inventory management to categorize samples as "Real" or "Synthetic."
*   **Outcome:** The system now features a robust backend suite for monitoring and organizing forensic data categories.

### Week 3: Intelligence Pivot & 60/40 Weights (April 20 – April 22)
*   **Objective:** Integrating Generative AI for reasoning.
*   **Key Tasks:** 
    *   Integrated the Google Gemini 3 Flash model via the official SDK.
    *   Implemented the **60/40 hybrid logic**, shifting the focus from raw numbers to descriptive AI reasoning informed by those numbers.
    *   Hardened API key security for multi-environment deployments.
*   **Outcome:** VoxGuard transitioned from a simple calculator to an intelligent forensic analyst.

### Week 4: UX Refinement & Persistence (April 27 – April 29)
*   **Objective:** Modernizing the interface and saving session data.
*   **Key Tasks:** 
    *   Redesigned the dashboard flow: Refactored results from pop-ups to a permanent **inline dashboard**.
    *   Implemented **localStorage persistence**, allowing scan history to survive page refreshes.
*   **Outcome:** Optimized the workflow for investigators, allowing for rapid multi-audio analysis.

### Week 5: Stabilization & Convergence (May 4 – May 6)
*   **Objective:** Final polishing and server-side stability.
*   **Key Tasks:** 
    *   Refined vocal characteristic markers and status logic (Safe/Critical).
    *   Fixed a critical backend crash by migrating legacy wildcard routing ( `*` ) to modern regex patterns ( `/(.*)` ).
    *   Achieved **Feature Convergence**, where AI and local metrics work in a unified feedback loop.
*   **Outcome:** A production-ready forensic tool with high stability and refined hybrid accuracy.

---
**Document Status:** Finalized | **Date:** May 10, 2026
