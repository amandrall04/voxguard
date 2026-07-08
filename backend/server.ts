import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { spawn } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { analyzeAudio } from "./services/audioProcessor.js";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.get("/test-chatgpt", (req, res) => {
  res.json({
    message: "This is the latest deployment!",
    version: "1.0.1",
    time: new Date().toISOString(),
  });
});

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      process.env.FRONTEND_URL || ""
    ],
    credentials: true,
  })
);

const PORT = Number(process.env.PORT) || 3000;

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitStore = new Map<string, number[]>();

// Multer setup for audio uploads
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

app.use(express.json({ limit: "20mb" }));

app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) {
    return next();
  }

  const start = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - start;
    console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${durationMs}ms)`);
  });

  next();
});

app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) {
    return next();
  }

  const rawIp = (req.headers["x-forwarded-for"] as string | undefined) || req.ip;
  const ip = rawIp?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();

  const recent = (rateLimitStore.get(ip) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitStore.set(ip, recent);
    return res.status(429).json({
      error: "Rate limit exceeded. Please wait and try again.",
    });
  }

  recent.push(now);
  rateLimitStore.set(ip, recent);
  next();
});

// API Routes
app.get("/health", (_, res) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "voice-clone-detection",
    version: "1.0.1",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/ml-analyze", async (req, res) => {
  try {
    const { base64Audio, fileName, mimeType } = req.body;
    
    if (!base64Audio) {
      return res.status(400).json({ error: "Missing audio data" });
    }

    // Process real audio data
    const buffer = Buffer.from(base64Audio, "base64");
    const tempFilePath = path.join(uploadDir, `${Date.now()}-${fileName || "temp.audio"}`);
    fs.writeFileSync(tempFilePath, buffer);

    const mlResult = await analyzeAudio(tempFilePath);
    const thresholdScore = mlResult.thresholdScore ?? mlResult.score;
    const modelScore = mlResult.score;
    const geminiResult = await tryGeminiAnalysis({
      base64Audio,
      mimeType: mimeType || "audio/wav",
      dspSummary: buildFeatureSummary(mlResult.features),
      dspLabel: thresholdScore >= 50 ? "FAKE" : "REAL",
      dspConfidence: Math.min(100, Math.max(5, Math.abs(thresholdScore - 50) * 2)),
    });

    // Clean up temp file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (err) {
      console.warn("Failed to delete temp file:", err);
    }

    res.json(buildAnalysisResponse(
      mlResult,
      fileName || "uploaded.audio",
      geminiResult,
      thresholdScore,
      modelScore
    ));
  } catch (error) {
    console.error("ML Analysis error:", error);
    res.status(500).json({ error: "Failed to perform ML analysis" });
  }
});

app.post("/api/analyze", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing audio file" });
    }

    const mlResult = await analyzeAudio(req.file.path);
    const thresholdScore = mlResult.thresholdScore ?? mlResult.score;
    const modelScore = mlResult.score;
    const geminiResult = await tryGeminiAnalysis({
      base64Audio: fs.readFileSync(req.file.path).toString("base64"),
      mimeType: req.file.mimetype || "audio/wav",
      dspSummary: buildFeatureSummary(mlResult.features),
      dspLabel: thresholdScore >= 50 ? "FAKE" : "REAL",
      dspConfidence: Math.min(100, Math.max(5, Math.abs(thresholdScore - 50) * 2)),
    });

    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.warn("Failed to delete temp file:", err);
    }

    res.json(buildAnalysisResponse(
      mlResult,
      req.file.originalname,
      geminiResult,
      thresholdScore,
      modelScore
    ));
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: "Failed to analyze audio file" });
  }
});

app.get("/api/dataset", (req, res) => {
  const datasetRoot = path.join(process.cwd(), "dataset");
  const realDir = path.join(datasetRoot, "real");
  const aiDir = path.join(datasetRoot, "ai");

  const listSamples = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
      return [] as string[];
    }

    return fs.readdirSync(dirPath).filter((name) => !name.startsWith("."));
  };

  const realSamples = listSamples(realDir);
  const aiSamples = listSamples(aiDir);

  res.json({
    real: { count: realSamples.length, samples: realSamples },
    ai: { count: aiSamples.length, samples: aiSamples },
  });
});

app.post("/api/train", async (req, res) => {
  try {
    const result = await trainLocalModel();
    res.json(result);
  } catch (error) {
    console.error("Training error:", error);
    res.status(500).json({ error: "Failed to train local model" });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
    },
    appType: "spa",
  });

  app.use(vite.middlewares);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log("=================================");
  console.log(`🚀 Server listening on port ${PORT}`);
  console.log(`Health: http://0.0.0.0:${PORT}/health`);
  console.log("=================================");
});

function buildAnalysisResponse(
  mlResult: Awaited<ReturnType<typeof analyzeAudio>>,
  fileName: string,
  geminiResult?: GeminiResult | null,
  thresholdScore?: number,
  modelScore?: number
) {
  const features = mlResult.features;
  const dspScore = thresholdScore ?? mlResult.score;
  const mlScore = modelScore ?? mlResult.score;
  let combinedScore = mlScore * 0.7 + dspScore * 0.3;

  if (geminiResult) {
    const geminiScore = geminiResult.label === "FAKE"
      ? 50 + geminiResult.confidence / 2
      : 50 - geminiResult.confidence / 2;
    // 60/40 hybrid weighting: Gemini 60%, local 40%.
    combinedScore = clampScore(combinedScore * 0.4 + geminiScore * 0.6);
  }

  // Very strict override for perfect flatness (often means direct code generation silence without organic noise floor)
  if (features.spectralFlatness === 0) {
    combinedScore = Math.max(combinedScore, 65);
  }

  const label = combinedScore > 50 ? "FAKE" : "REAL";
  const confidence = Math.min(99, Math.max(12, 50 + Math.abs(combinedScore - 50) * 0.95));

  const markers = [
    {
      id: "spectral-centroid",
      name: "Spectral Centroid",
      value: normalize(features.spectralCentroid, 1800, 4200),
      threshold: 0.6,
      description: "High-frequency artifacts and brightness.",
    },
    {
      id: "temporal-jitter",
      name: "Temporal Jitter (ZCR)",
      value: normalize(features.zeroCrossingRate, 0.05, 0.16),
      threshold: 0.6,
      description: "Voicing instability from synthetic articulation.",
    },
    {
      id: "rms-energy",
      name: "RMS Energy",
      value: normalize(0.3 - features.rms, 0, 0.3),
      threshold: 0.55,
      description: "Low energy variance can indicate AI smoothing.",
    },
    {
      id: "spectral-flatness",
      name: "Spectral Flatness",
      value: normalize(features.spectralFlatness, 0.1, 0.7),
      threshold: 0.6,
      description: "Noise-like textures and robotic smoothness.",
    },
    {
      id: "pitch-variance",
      name: "Pitch Variability",
      value: normalize(30 - features.pitchStd, 0, 30),
      threshold: 0.55,
      description: "Low pitch variation signals synthetic stability.",
    },
  ].map((marker) => ({
    ...marker,
    status: marker.value >= marker.threshold * 1.2
      ? "CRITICAL"
      : marker.value >= marker.threshold
      ? "WARNING"
      : "SAFE",
  }));

  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    fileName,
    label,
    confidence,
    forensicMarkers: markers,
    spectralData: [
      { name: "Centroid (Hz)", value: round(features.spectralCentroid) },
      { name: "ZCR", value: round(features.zeroCrossingRate, 4) },
      { name: "Flatness", value: round(features.spectralFlatness, 4) },
      { name: "RMS", value: round(features.rms, 4) },
      { name: "Pitch Std", value: round(features.pitchStd, 2) },
      { name: "MFCC Var", value: round(features.mfccVariance, 2) },
      { name: "Energy Var", value: round(features.energyVariance, 5) },
    ],
    detailedReport: buildDetailedReport(features),
    localReasoning: buildThresholdSummary(features, dspScore, mlScore),
    geminiReasoning: geminiResult?.reasoning || buildDecisionSummary(label, confidence, features),
  };
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

type FeatureSummary = Awaited<ReturnType<typeof analyzeAudio>>["features"];

type GeminiResult = {
  label: "REAL" | "FAKE";
  confidence: number;
  reasoning: string;
};

function normalize(value: number, min: number, max: number) {
  if (!isFinite(value)) return 0;
  const clamped = Math.min(max, Math.max(min, value));
  return (clamped - min) / (max - min || 1);
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildFeatureSummary(features: FeatureSummary) {
  const bitRateKbps = isFinite(features.bitRate) && features.bitRate > 0
    ? Math.round(features.bitRate / 1000)
    : 0;
  return [
    `Duration ${round(features.durationSec, 2)}s at ${features.sampleRate}Hz, bitrate ${bitRateKbps || "unknown"}kbps.`,
    `Spectral centroid ${Math.round(features.spectralCentroid)}Hz (std ${Math.round(features.spectralCentroidStd)}), flatness ${round(features.spectralFlatness, 3)}.`,
    `ZCR ${round(features.zeroCrossingRate, 4)} (std ${round(features.zeroCrossingRateStd, 4)}), RMS ${round(features.rms, 4)}.`,
    `Dynamic range ${round(features.dynamicRangeDb, 1)}dB, crest factor ${round(features.crestFactorDb, 1)}dB.`,
  ].join(" ");
}

function buildThresholdSummary(features: FeatureSummary, dspScore: number, mlScore: number) {
  const jitterScore = features.zeroCrossingRate * 5;
  const reasons = [
    jitterScore > 0.45 ? "Temporal instability detected" : null,
    features.rms < 0.2 ? "Low energy variation (possible AI smoothing)" : null,
    features.spectralCentroid > 2500 ? "High frequency artifacts present" : null,
    features.pitchStd < 18 ? "Low pitch variation" : null,
    features.mfccVariance < 55 ? "Low MFCC variance" : null,
    features.spectralFlatness > 0.5 ? "Spectral smoothness detected" : null,
  ].filter(Boolean);

  const markerText = reasons.length > 0 ? reasons.join(" | ") : "No strong synthetic markers observed.";

  return [
    buildFeatureSummary(features),
    `DSP score ${Math.round(dspScore)}%, ML score ${Math.round(mlScore)}%. ${markerText}`,
  ].join(" ");
}

function buildDecisionSummary(
  label: string,
  confidence: number,
  features: FeatureSummary
) {
  const confidenceTag = confidence >= 75 ? "high" : confidence >= 55 ? "medium" : "low";
  return `Decision ${label} with ${confidenceTag} confidence based on multi-frame DSP statistics and compression cues.`;
}

function buildDetailedReport(features: FeatureSummary) {
  return `Multi-frame analysis across ${Math.round(features.durationSec)}s detected centroid ${Math.round(features.spectralCentroid)}Hz, flatness ${round(features.spectralFlatness, 3)}, and dynamic range ${round(features.dynamicRangeDb, 1)}dB.`;
}

async function tryGeminiAnalysis({
  base64Audio,
  mimeType,
  dspSummary,
  dspLabel,
  dspConfidence,
}: {
  base64Audio: string;
  mimeType: string;
  dspSummary: string;
  dspLabel: "REAL" | "FAKE";
  dspConfidence: number;
}): Promise<GeminiResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!base64Audio) return null;
  if (base64Audio.length > 8_000_000) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a strict audio forensics AI expert. Review the audio sample.
    The local digital signal processing (DSP) rules reported: ${dspSummary}
    The local baseline model predicts: ${dspLabel} (${Math.round(dspConfidence)}% confidence).
    
    Do NOT just agree with the local baseline. Many deepfakes fool standard DSP rules.
    Look for AI artifacts: perfect zero flatness, unnatural spectral gaps, perfectly continuous breath/silence, very high ZCR with very low RMS.
    Return JSON with {"label":"REAL"|"FAKE", "confidence":0-100, "reasoning":"..."}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Audio, mimeType } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text?.trim();
    if (!text) return null;
    const parsed = JSON.parse(text);
    if (parsed?.label !== "REAL" && parsed?.label !== "FAKE") return null;

    return {
      label: parsed.label,
      confidence: Number(parsed.confidence) || dspConfidence,
      reasoning: String(parsed.reasoning || "Gemini analysis completed."),
    };
  } catch (error) {
    console.warn("Gemini analysis skipped:", error);
    return null;
  }
}

async function trainLocalModel() {
  const scriptPath = new URL("../ml/train_model.py", import.meta.url);
  const pythonBin = process.env.PYTHON_BIN || "python3";
  const datasetDir = path.join(process.cwd(), "dataset");
  const modelPath = process.env.MODEL_PATH || path.join(process.cwd(), "ml", "model.joblib");
  const metricsPath = path.join(process.cwd(), "ml", "model_metrics.json");

  return new Promise((resolve, reject) => {
    const child = spawn(
      pythonBin,
      [scriptPath.pathname, "--dataset", datasetDir, "--model", modelPath, "--metrics", metricsPath],
      { env: { ...process.env, MODEL_PATH: modelPath } }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.error("Training failed:", stderr.trim());
        return reject(new Error(stderr.trim() || `Training exited with ${code}`));
      }

      try {
        const parsed = JSON.parse(stdout || "{}");
        resolve(parsed);
      } catch (error) {
        reject(error as Error);
      }
    });
  });
}
