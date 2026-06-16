import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import Meyda from "meyda";

export interface AnalysisResult {
  score: number;
  thresholdScore?: number;
  features: {
    spectralCentroid: number;
    spectralCentroidStd: number;
    zeroCrossingRate: number;
    zeroCrossingRateStd: number;
    rms: number;
    rmsStd: number;
    spectralFlatness: number;
    spectralFlatnessStd: number;
    mfccMean: number;
    mfccVariance: number;
    pitchStd: number;
    energyVariance: number;
    dynamicRangeDb: number;
    crestFactorDb: number;
    durationSec: number;
    sampleRate: number;
    bitRate: number;
  };
}

/**
 * Analyzes audio file using real digital signal processing (DSP) headers and Meyda.
 */
export async function analyzeAudio(filePath: string): Promise<AnalysisResult> {
  if (!fs.existsSync(filePath)) {
    throw new Error("Audio file not found.");
  }

  const { bitRate, sampleRate, durationSec } = await runFfprobe(filePath);
  const features = await extractFeatures(filePath, sampleRate, durationSec);
  features.bitRate = bitRate;

  const modelScore = await predictWithLocalModel(filePath);
  const score = modelScore ?? computeModelScore(features);
  const thresholdScore = computeThresholdScore(features);

  return {
    score,
    thresholdScore,
    features,
  };
}

async function predictWithLocalModel(filePath: string): Promise<number | null> {
  const modelPath = process.env.MODEL_PATH || path.join(process.cwd(), "ml", "model.joblib");
  if (!fs.existsSync(modelPath)) {
    return null;
  }

  const scriptPath = new URL("../../ml/predict.py", import.meta.url);
  const pythonBin = process.env.PYTHON_BIN || "python3";

  return new Promise((resolve) => {
    const child = spawn(pythonBin, [scriptPath.pathname, filePath], {
      env: { ...process.env, MODEL_PATH: modelPath },
    });

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
        console.warn("Local model prediction failed:", stderr.trim());
        return resolve(null);
      }

      try {
        const parsed = JSON.parse(stdout);
        const score = Number(parsed?.score);
        if (!isFinite(score)) return resolve(null);
        resolve(Math.max(0, Math.min(100, score)));
      } catch (error) {
        console.warn("Failed to parse local model output:", error);
        resolve(null);
      }
    });
  });
}

function resolveFfmpegPath() {
  if (process.env.FFMPEG_PATH) {
    return process.env.FFMPEG_PATH;
  }

  return typeof ffmpegPath === "string" ? ffmpegPath : "ffmpeg";
}

function resolveFfprobePath() {
  if (process.env.FFPROBE_PATH) {
    return process.env.FFPROBE_PATH;
  }

  return typeof ffprobePath === "string" ? ffprobePath : "ffprobe";
}

async function runFfprobe(
  filePath: string
): Promise<{ bitRate: number; sampleRate: number; durationSec: number }> {
  return new Promise((resolve, reject) => {
    const args = [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_entries",
      "format=bit_rate,duration",
      "-show_entries",
      "stream=sample_rate,channels",
      "-i",
      filePath,
    ];

    const child = spawn(resolveFfprobePath(), args);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(stderr.trim() || `ffprobe exited with ${code}`));
      }

      try {
        const parsed = JSON.parse(stdout);
        const bitRate = parseInt(parsed.format?.bit_rate || "192000", 10);
        const durationSec = parseFloat(parsed.format?.duration || "0");
        const streamWithSampleRate = (parsed.streams || []).find(
          (stream: { sample_rate?: string }) => stream.sample_rate
        );
        const sampleRate = parseInt(streamWithSampleRate?.sample_rate || "44100", 10);
        resolve({ bitRate, sampleRate, durationSec });
      } catch (err) {
        reject(err as Error);
      }
    });
  });
}

async function extractFeatures(filePath: string, sampleRate: number, durationSec: number) {
  try {
    const pythonFeatures = await extractViaPython(filePath);
    return {
      ...pythonFeatures,
      dynamicRangeDb: 12,
      crestFactorDb: 12,
      durationSec: pythonFeatures.durationSec || durationSec,
      sampleRate: pythonFeatures.sampleRate || sampleRate,
      bitRate: 0,
    };
  } catch (error) {
    return extractFallbackFeatures(filePath, sampleRate, durationSec);
  }
}

async function extractFallbackFeatures(filePath: string, sampleRate: number, durationSec: number) {
  return new Promise<AnalysisResult["features"]>((resolve, reject) => {
    const bufferSize = 1024;
    const hopSize = 512;
    const samples: number[] = [];
    const targetSampleRate = 16000;
    const maxSeconds = 20;
    const maxSamples = targetSampleRate * maxSeconds;

    // Convert to raw f32le mono to analyze with Meyda
    const args = [
      "-i",
      filePath,
      "-f",
      "f32le",
      "-ac",
      "1",
      "-ar",
      targetSampleRate.toString(),
      "pipe:1",
    ];

    const child = spawn(resolveFfmpegPath(), args);

    child.stdout.on("data", (chunk: Buffer) => {
      if (samples.length < maxSamples) {
        for (let i = 0; i < chunk.length; i += 4) {
          if (samples.length < maxSamples) {
            samples.push(chunk.readFloatLE(i));
          }
        }
      }
    });

    child.on("error", reject);
    child.stderr.on("data", () => {
      // Silence ffmpeg stderr unless needed for debugging.
    });

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`ffmpeg exited with ${code}`));
      }

      if (samples.length === 0) return reject(new Error("No audio data extracted"));
      if (samples.length < targetSampleRate) {
        return reject(new Error("Audio clip is too short for analysis"));
      }

      const centroidValues: number[] = [];
      const zcrValues: number[] = [];
      const rmsValues: number[] = [];
      const flatnessValues: number[] = [];

      for (let i = 0; i + bufferSize <= samples.length; i += hopSize) {
        const frame = samples.slice(i, i + bufferSize);
        const signal = new Float32Array(frame);

        const extracted = Meyda.extract(
          ["spectralCentroid", "zcr", "rms", "spectralFlatness"],
          signal
        ) as any;

        if (!extracted) continue;
        centroidValues.push(extracted.spectralCentroid || 0);
        zcrValues.push(extracted.zcr || 0);
        rmsValues.push(extracted.rms || 0);
        flatnessValues.push(extracted.spectralFlatness || 0);
      }

      if (centroidValues.length === 0) return reject(new Error("No frames analyzed"));

      const spectralCentroid = mean(centroidValues);
      const zeroCrossingRate = mean(zcrValues);
      const rms = mean(rmsValues);
      const spectralFlatness = mean(flatnessValues);

      const spectralCentroidStd = standardDeviation(centroidValues, spectralCentroid);
      const zeroCrossingRateStd = standardDeviation(zcrValues, zeroCrossingRate);
      const rmsStd = standardDeviation(rmsValues, rms);
      const spectralFlatnessStd = standardDeviation(flatnessValues, spectralFlatness);

      const peak = maxAbs(samples);
      const overallRms = Math.sqrt(mean(samples.map((value) => value * value)));
      const crestFactorDb = 20 * Math.log10((peak || 1e-6) / (overallRms || 1e-6));

      const dynamicRangeDb = estimateDynamicRangeDb(samples);

      resolve({
        spectralCentroid,
        spectralCentroidStd,
        zeroCrossingRate,
        zeroCrossingRateStd,
        rms,
        rmsStd,
        spectralFlatness,
        spectralFlatnessStd,
        mfccMean: 0,
        mfccVariance: 0,
        pitchStd: 0,
        energyVariance: 0,
        dynamicRangeDb: isFinite(dynamicRangeDb) ? dynamicRangeDb : 12,
        crestFactorDb: isFinite(crestFactorDb) ? crestFactorDb : 12,
        durationSec: durationSec || samples.length / targetSampleRate,
        sampleRate: targetSampleRate,
        bitRate: 0,
      });
    });
  });
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[], average: number) {
  if (values.length === 0) return 0;
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function maxAbs(values: number[]) {
  let max = 0;
  for (const value of values) {
    const abs = Math.abs(value);
    if (abs > max) max = abs;
  }
  return max;
}

function estimateDynamicRangeDb(values: number[]) {
  if (values.length === 0) return 0;
  const stride = Math.max(1, Math.floor(values.length / 10000));
  const absValues: number[] = [];
  for (let i = 0; i < values.length; i += stride) {
    absValues.push(Math.abs(values[i]));
  }
  absValues.sort((a, b) => a - b);
  const p20 = absValues[Math.floor(0.2 * (absValues.length - 1))] || 1e-6;
  const p95 = absValues[Math.floor(0.95 * (absValues.length - 1))] || 1e-6;
  return 20 * Math.log10(p95 / p20);
}

async function extractViaPython(filePath: string) {
  const scriptPath = new URL("../../ml/feature_extractor.py", import.meta.url);
  return new Promise<AnalysisResult["features"]>((resolve, reject) => {
    const child = spawn(process.env.PYTHON_BIN || "python3", [scriptPath.pathname, filePath]);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(stderr.trim() || `python exited with ${code}`));
      }

      try {
        const parsed = JSON.parse(stdout);
        if (parsed.error) {
          return reject(new Error(parsed.error));
        }
        resolve(parsed as AnalysisResult["features"]);
      } catch (error) {
        reject(error as Error);
      }
    });
  });
}

function computeThresholdScore(features: AnalysisResult["features"]) {
  let mlScore = 0;
  const jitterScore = features.zeroCrossingRate * 5;

  if (features.spectralCentroid > 3000) mlScore += 1;
  if (features.zeroCrossingRate > 0.09) mlScore += 1;
  if (features.rms < 0.2) mlScore += 1;
  if (features.mfccVariance < 55) mlScore += 2;
  if (features.pitchStd < 18) mlScore += 2;
  if (features.spectralFlatness > 0.5) mlScore += 1;

  const normalized = Math.min(100, (mlScore / 8) * 100);

  if (jitterScore > 0.6) {
    return Math.min(100, normalized + 10);
  }

  return normalized;
}

function computeModelScore(features: AnalysisResult["features"]) {
  const centroidScore = scaledScore(features.spectralCentroid, 2000, 4200);
  const zcrScore = scaledScore(features.zeroCrossingRate, 0.05, 0.16);
  const rmsScore = scaledInverseScore(features.rms, 0.08, 0.25);
  const mfccScore = scaledInverseScore(features.mfccVariance, 30, 120);
  const pitchScore = scaledInverseScore(features.pitchStd, 10, 60);
  const flatnessScore = scaledScore(features.spectralFlatness, 0.15, 0.6);
  const energyScore = scaledInverseScore(features.energyVariance, 0.0003, 0.01);

  const weighted =
    centroidScore * 0.14 +
    zcrScore * 0.12 +
    rmsScore * 0.12 +
    mfccScore * 0.18 +
    pitchScore * 0.18 +
    flatnessScore * 0.14 +
    energyScore * 0.12;

  return Math.round(clamp01(weighted) * 100);
}

function scaledScore(value: number, min: number, max: number) {
  if (!isFinite(value)) return 0.5;
  return clamp01((value - min) / (max - min || 1));
}

function scaledInverseScore(value: number, min: number, max: number) {
  if (!isFinite(value)) return 0.5;
  return 1 - clamp01((value - min) / (max - min || 1));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

