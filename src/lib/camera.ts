/** Capture an image from a webcam stream and return a downsized JPEG base64. */
export async function captureFromVideo(
  video: HTMLVideoElement,
  size = 320
): Promise<string> {
  const canvas = document.createElement("canvas");
  const targetW = size;
  const targetH = size;
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const side = Math.min(vw, vh);
  const sx = (vw - side) / 2;
  const sy = (vh - side) / 2;
  ctx.drawImage(video, sx, sy, side, side, 0, 0, targetW, targetH);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export interface CameraHandle {
  video: HTMLVideoElement | null;
  stop: () => void;
}

export async function startCamera(
  videoEl: HTMLVideoElement,
  facingMode: "user" | "environment" = "user"
): Promise<CameraHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  videoEl.srcObject = stream;
  await videoEl.play().catch(() => {});
  return {
    video: videoEl,
    stop: () => {
      stream.getTracks().forEach((t) => t.stop());
      videoEl.srcObject = null;
    },
  };
}
