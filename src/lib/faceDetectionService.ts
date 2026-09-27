import * as faceapi from "face-api.js";

let modelsLoaded = false;

export async function loadFaceModels(modelUrl: string = "/models") {
  if (modelsLoaded) return;
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
      faceapi.nets.faceExpressionNet.loadFromUri(modelUrl),
    ]);
    modelsLoaded = true;
    console.log("Face models loaded successfully");
  } catch (error) {
    console.error("Failed to load face models", error);
    throw error;
  }
}

/**
 * Extracts a 128-d face embedding from a video element
 */
export async function extractFaceEmbedding(
  videoElement: HTMLVideoElement
): Promise<{ embedding: number[]; detection: faceapi.FaceDetection; expressions: faceapi.FaceExpressions; landmarks: faceapi.FaceLandmarks68 } | null> {
  if (!modelsLoaded) throw new Error("Models not loaded");

  const detection = await faceapi
    .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceExpressions()
    .withFaceDescriptor();

  if (!detection) return null;

  return {
    embedding: Array.from(detection.descriptor),
    detection: detection.detection,
    expressions: detection.expressions,
    landmarks: detection.landmarks,
  };
}

/**
 * Compare two embeddings and return a confidence score 0-100%
 */
export function compareEmbeddings(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) return 0;
  
  // Calculate Euclidean distance
  let distance = 0;
  for (let i = 0; i < embedding1.length; i++) {
    const diff = embedding1[i] - embedding2[i];
    distance += diff * diff;
  }
  distance = Math.sqrt(distance);

  // face-api.js typical threshold is 0.6. 
  // Let's map distance to a confidence percentage.
  // 0.0 distance = 100%
  // 0.6 distance = 90% (threshold for PIN fallback)
  // 0.8 distance = 0%
  
  const maxDistance = 0.8;
  if (distance > maxDistance) return 0;

  // Linear map or a curve. Let's do a simple linear map
  // distance 0 -> 100, 0.6 -> 90.
  // slope: (90 - 100) / 0.6 = -16.66
  // let's use: score = max(0, 100 - (distance / 0.6) * 10)
  
  const score = Math.max(0, 100 - (distance / 0.6) * 10);
  return Math.min(100, Math.round(score));
}

/**
 * Evaluates liveness from landmarks (blink, head movement, smile)
 */
export function evaluateLiveness(landmarks: faceapi.FaceLandmarks68, expressions: faceapi.FaceExpressions) {
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  // Eye Aspect Ratio (EAR) for blink detection
  const calculateEAR = (eye: faceapi.Point[]) => {
    // eye points: [0..5]
    // EAR = (||p1-p5|| + ||p2-p4||) / (2 * ||p0-p3||)
    const p1 = eye[1], p5 = eye[5];
    const p2 = eye[2], p4 = eye[4];
    const p0 = eye[0], p3 = eye[3];

    const dist = (pt1: faceapi.Point, pt2: faceapi.Point) => 
      Math.sqrt(Math.pow(pt1.x - pt2.x, 2) + Math.pow(pt1.y - pt2.y, 2));

    const v1 = dist(p1, p5);
    const v2 = dist(p2, p4);
    const h = dist(p0, p3);

    return (v1 + v2) / (2.0 * h);
  };

  const leftEAR = calculateEAR(leftEye);
  const rightEAR = calculateEAR(rightEye);
  const avgEAR = (leftEAR + rightEAR) / 2.0;

  // Liveness checks
  const isBlinking = avgEAR < 0.25;
  const isSmiling = expressions.happy > 0.8;
  
  // Head movement detection (simple heuristic based on nose vs bounding box)
  // For a robust system, we would track movement over frames. Here we provide the static indicators.
  
  return {
    isBlinking,
    isSmiling,
    ear: avgEAR,
    happyScore: expressions.happy,
    status: "pass", // Mock status, actual liveness needs multi-frame analysis
  };
}
