import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { loadFaceModels, extractFaceEmbedding, evaluateLiveness } from "@/lib/faceDetectionService";
import { Button } from "@/components/ui";

interface FaceScannerProps {
  mode: "register" | "verify";
  onComplete: (embedding: number[], photoBase64: string, liveness: any) => void;
  onError: (error: string) => void;
  requiredConfidence?: number;
}

export function FaceScanner({ mode, onComplete, onError }: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("Initializing camera...");
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Registration steps
  const registerAngles = ["Front", "Left", "Right", "Up", "Down"];
  const [currentAngleIndex, setCurrentAngleIndex] = useState(0);
  const [embeddings, setEmbeddings] = useState<number[][]>([]);

  useEffect(() => {
    async function setup() {
      try {
        await loadFaceModels();
        setStatus("Starting camera...");
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setLoading(false);
        setStatus(mode === "register" ? `Please face: ${registerAngles[0]}` : "Position your face in the frame");
      } catch (err: any) {
        setLoading(false);
        onError(err.message || "Failed to access camera or load models");
      }
    }
    setup();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  const scanFace = async () => {
    if (!videoRef.current) return;
    setStatus("Scanning...");
    
    try {
      const result = await extractFaceEmbedding(videoRef.current);
      if (!result) {
        setStatus("No face detected. Please try again.");
        return;
      }

      const liveness = evaluateLiveness(result.landmarks, result.expressions);
      const photoBase64 = captureFrame() || "";

      if (mode === "register") {
        const newEmbeddings = [...embeddings, result.embedding];
        setEmbeddings(newEmbeddings);
        
        if (currentAngleIndex + 1 < registerAngles.length) {
          setCurrentAngleIndex(currentAngleIndex + 1);
          setStatus(`Please face: ${registerAngles[currentAngleIndex + 1]}`);
        } else {
          // Average embeddings to create a master embedding
          const avgEmbedding = newEmbeddings[0].map((_, i) => 
            newEmbeddings.reduce((sum, emb) => sum + emb[i], 0) / newEmbeddings.length
          );
          
          setStatus("Registration complete!");
          onComplete(avgEmbedding, photoBase64, liveness);
        }
      } else {
        setStatus("Verification complete!");
        onComplete(result.embedding, photoBase64, liveness);
      }
    } catch (err: any) {
      setStatus("Error scanning face.");
      onError(err.message || "Error scanning face");
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto rounded-3xl overflow-hidden glass border border-base-border shadow-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-accent" />
          <h3 className="text-sm font-semibold text-white">
            {mode === "register" ? "Face Registration" : "Face Verification"}
          </h3>
        </div>
        {mode === "register" && (
          <div className="text-xs font-medium text-muted bg-base-surface px-2 py-1 rounded-lg">
            {currentAngleIndex + 1} / {registerAngles.length}
          </div>
        )}
      </div>

      {/* Video Container */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-base-bg flex items-center justify-center border border-base-border/50">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-muted">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="text-xs">{status}</span>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              onPlay={() => setStatus(mode === "register" ? `Please face: ${registerAngles[currentAngleIndex]}` : "Ready to scan")}
            />
            {/* Scan overlay */}
            <div className="absolute inset-0 border-4 border-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] rounded-full m-8 pointer-events-none transition-all duration-300" />
            
            {/* Scan animation line */}
            {status === "Scanning..." && (
              <div className="absolute inset-x-8 top-1/2 h-0.5 bg-accent shadow-[0_0_10px_#00E5FF] animate-scan pointer-events-none" />
            )}
          </>
        )}
      </div>

      {/* Hidden canvas for capturing frames */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Status & Actions */}
      <div className="mt-4 flex flex-col items-center gap-3">
        <p className="text-sm font-medium text-center text-white min-h-[20px]">
          {status}
        </p>
        
        {!loading && (
          <Button
            onClick={scanFace}
            size="lg"
            className="w-full"
            disabled={status === "Scanning..."}
          >
            {mode === "register" ? "Capture Angle" : "Verify Face"}
          </Button>
        )}
        
        {mode === "verify" && (
          <p className="text-[10px] text-muted-faint text-center flex items-center justify-center gap-1 mt-2">
            <ShieldAlert className="w-3 h-3" />
            Liveness detection enabled. Keep your head straight.
          </p>
        )}
      </div>
    </div>
  );
}
