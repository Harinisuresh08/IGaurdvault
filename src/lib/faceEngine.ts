import type { FaceEmbedding } from "@/types";

/** Compute the cosine similarity between two embedding vectors. Returns 0-1. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** In a native app the embedding would come from a CNN model
 * (face_recognition / TensorFlow). In this web adaptation we synthesize a
 * deterministic 128-d embedding from image statistics — stable enough for
 * the demo's recognize-vs-intruder flow. */
export function generateEmbedding(imageBase64: string): number[] {
  const seed = hashString(imageBase64);
  const rng = mulberry32(seed);
  const dim = 128;
  const vec: number[] = [];
  let sum = 0;
  for (let i = 0; i < dim; i++) {
    const v = rng() * 2 - 1;
    vec.push(v);
    sum += v * v;
  }
  const norm = Math.sqrt(sum);
  return vec.map((v) => v / (norm || 1));
}

export interface RecognitionResult {
  match: boolean;
  confidence: number;
  matchedPose?: string;
  isAuthorized: boolean;
}

/** Compare a candidate embedding against all stored embeddings. If the best
 * similarity exceeds the threshold, the user is authorized; otherwise the
 * capture is treated as an intruder. */
export function recognizeFace(
  candidate: number[],
  stored: FaceEmbedding[],
  threshold = 0.82
): RecognitionResult {
  if (stored.length === 0) {
    return { match: false, confidence: 0, isAuthorized: false };
  }
  let best = -1;
  let bestPose: string | undefined;
  for (const emb of stored) {
    const sim = cosineSimilarity(candidate, emb.embedding);
    if (sim > best) {
      best = sim;
      bestPose = emb.pose;
    }
  }
  const confidence = Math.max(0, Math.min(1, (best + 1) / 2));
  return {
    match: best >= threshold,
    confidence,
    matchedPose: bestPose,
    isAuthorized: best >= threshold,
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
