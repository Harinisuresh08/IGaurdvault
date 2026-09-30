import * as faceapi from '@vladmandic/face-api';
import type { FaceEmbedding } from "@/types";

const LOCAL_MODEL_URL = '/models/';
const REMOTE_MODEL_URL = 'https://cdn.jsdelivr.net/gh/vladmandic/face-api@master/model/';

let modelsLoadedPromise: Promise<void> | null = null;

export async function loadModels() {
  if (modelsLoadedPromise) return modelsLoadedPromise;

  if (typeof window !== 'undefined') {
    const loadFrom = (url: string) => Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(url),
      faceapi.nets.faceLandmark68Net.loadFromUri(url),
      faceapi.nets.faceRecognitionNet.loadFromUri(url),
    ]);

    modelsLoadedPromise = loadFrom(LOCAL_MODEL_URL)
      .catch(() => loadFrom(REMOTE_MODEL_URL))
      .then(() => {
        console.log('[FaceEngine] Models loaded successfully');
      })
      .catch((error) => {
        modelsLoadedPromise = null;
        console.error('[FaceEngine] Model loading failed:', error);
        throw new Error('Face recognition models could not be loaded. Check your network connection and try again.');
      });
  }
  return modelsLoadedPromise;
}

/**
 * Normalize any possible shape that a JSONB embedding field may return from Supabase.
 *
 * Supabase JSONB can return:
 *  - A proper JS Array:            [0.1, 0.2, ...]          ← best case
 *  - A plain object with int keys: { "0": 0.1, "1": 0.2 }  ← common Supabase JSONB quirk
 *  - A JSON string:                "[0.1,0.2,...]"          ← if stored as text accidentally
 *  - A Float32Array:               Float32Array([...])      ← if previously cast
 *
 * Returns a number[] of exactly 128 elements, or null if the data is invalid.
 */
export function normalizeEmbedding(raw: unknown): number[] | null {
  if (raw === null || raw === undefined) return null;

  let arr: unknown = raw;

  // --- Handle JSON string ---
  if (typeof arr === 'string') {
    try {
      arr = JSON.parse(arr);
    } catch {
      // Bare comma-separated numbers: "0.1,0.2,..."
      const parsed = (arr as string).replace(/^\[|\]$/g, '').split(',').map(Number);
      if (parsed.length === 128 && parsed.every(n => !isNaN(n))) return parsed;
      console.warn('[FaceEngine] Could not parse string embedding:', arr);
      return null;
    }
  }

  // --- Handle Float32Array / TypedArray ---
  if (ArrayBuffer.isView(arr) && !(arr instanceof DataView)) {
    const nums = Array.from(arr as Float32Array).map(Number);
    if (nums.length === 128) return nums;
    console.warn('[FaceEngine] TypedArray embedding wrong length:', nums.length);
    return null;
  }

  // --- Handle plain JS Array ---
  if (Array.isArray(arr)) {
    if (arr.length !== 128) {
      console.warn('[FaceEngine] Array embedding wrong length:', arr.length);
      return null;
    }
    const nums = arr.map(x => Number(x));
    if (nums.some(n => isNaN(n))) {
      console.warn('[FaceEngine] Array embedding contains NaN values');
      return null;
    }
    return nums;
  }

  // --- Handle plain object with numeric keys (Supabase JSONB quirk) ---
  // e.g. { "0": 0.123, "1": 0.456, ... }
  if (typeof arr === 'object' && arr !== null) {
    const keys = Object.keys(arr as Record<string, unknown>);
    const numKeys = keys.map(Number).filter(k => !isNaN(k)).sort((a, b) => a - b);

    if (numKeys.length === 128) {
      const obj = arr as Record<string, unknown>;
      const nums = numKeys.map(k => Number(obj[String(k)]));
      if (nums.some(n => isNaN(n))) {
        console.warn('[FaceEngine] Object embedding contains NaN values');
        return null;
      }
      console.log('[FaceEngine] Converted object-keyed JSONB embedding to array (128 dims)');
      return nums;
    }

    console.warn('[FaceEngine] Object embedding has wrong number of numeric keys:', numKeys.length, 'total keys:', keys.length);
    return null;
  }

  console.warn('[FaceEngine] Unknown embedding format:', typeof arr, arr);
  return null;
}

/** Euclidean distance, computed manually to avoid any library casting issues. */
export function euclidianDistance(a: number[] | Float32Array, b: number[] | Float32Array): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = (a[i] as number) - (b[i] as number);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/** Cosine similarity between two embedding vectors. Returns value in [-1, 1]. */
export function cosineSimilarity(a: number[] | Float32Array, b: number[] | Float32Array): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] as number) * (b[i] as number);
    normA += (a[i] as number) * (a[i] as number);
    normB += (b[i] as number) * (b[i] as number);
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Generate a 128-dim face descriptor using face-api.js.
 * @param imageBase64 The base64 data-URL of the image.
 * @returns The 128-dimensional embedding as number[], or null if no face found.
 */
export async function generateEmbedding(imageBase64: string): Promise<number[] | null> {
  try {
    await loadModels();

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image failed to load'));
      img.src = imageBase64;
    });

    const detection = await faceapi
      .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      console.warn('[FaceEngine] generateEmbedding: no face detected');
      return null;
    }

    const embedding = Array.from(detection.descriptor);
    console.log('[FaceEngine] Generated embedding, dims:', embedding.length, 'sample[0]:', embedding[0]?.toFixed(4));
    return embedding;
  } catch (error) {
    console.error('[FaceEngine] generateEmbedding failed:', error);
    return null;
  }
}

export interface RecognitionResult {
  match: boolean;
  confidence: number;
  matchedPose?: string;
  bestDistance: number;
  isAuthorized: boolean;
}

/**
 * Compare a candidate embedding against all stored embeddings.
 *
 * face-api descriptors are L2-normalised 128-dim vectors.
 * Typical empirical thresholds:
 *   - Same person:      Euclidean dist ≈ 0.30–0.55
 *   - Different people: Euclidean dist ≈ 0.70–1.20
 *
 * We use 0.6 as the default cutoff (matches face-api's own LabeledFaceDescriptors default).
 */
export function recognizeFace(
  candidate: number[],
  stored: FaceEmbedding[],
  threshold = 0.65
): RecognitionResult {
  if (stored.length === 0) {
    console.warn('[FaceEngine] recognizeFace: no stored embeddings to compare against');
    return { match: false, confidence: 0, bestDistance: Infinity, isAuthorized: false };
  }

  let bestDistance = Infinity;
  let bestPose: string | undefined;
  let validCount = 0;

  for (const emb of stored) {
    // Normalize regardless of what Supabase returns
    const normalized = normalizeEmbedding(emb.embedding);
    if (!normalized) {
      console.warn('[FaceEngine] Skipping embedding for pose:', emb.pose, '— could not normalize. Raw type:', typeof emb.embedding);
      continue;
    }
    validCount++;

    const dist = euclidianDistance(candidate, normalized);
    console.log(`[FaceEngine] pose="${emb.pose}" dist=${dist.toFixed(4)} (threshold=${threshold})`);

    if (dist < bestDistance) {
      bestDistance = dist;
      bestPose = emb.pose;
    }
  }

  console.log(`[FaceEngine] Compared against ${validCount}/${stored.length} valid embeddings. bestDist=${bestDistance.toFixed(4)} threshold=${threshold}`);

  if (validCount === 0) {
    console.error('[FaceEngine] CRITICAL: No valid embeddings could be parsed from stored data! Check Supabase JSONB format.');
    return { match: false, confidence: 0, bestDistance: Infinity, isAuthorized: false };
  }

  const match = bestDistance <= threshold;

  // Convert Euclidean distance to a 0–1 confidence score.
  // For L2-normalised vectors: cosine_sim ≈ 1 - dist²/2
  let confidence = 0;
  if (bestDistance !== Infinity) {
    // Map [0, threshold] → [1, 0] linearly for a clean UX percentage
    confidence = Math.max(0, Math.min(1, 1 - bestDistance / threshold));
  }

  console.log(`[FaceEngine] Result: match=${match} bestPose="${bestPose}" confidence=${(confidence * 100).toFixed(1)}%`);

  return {
    match,
    confidence,
    matchedPose: bestPose,
    bestDistance,
    isAuthorized: match,
  };
}
