import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanFace,
  Camera,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { Card, SectionTitle, Button, Badge, Spinner } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import { startCamera, captureFromVideo, type CameraHandle } from "@/lib/camera";
import { generateEmbedding, recognizeFace, type RecognitionResult } from "@/lib/faceEngine";
import { getDeviceInfo, getGeoInfo } from "@/lib/device";
import { isLocationTrusted } from "@/lib/securityEngine";
import {
  logIntruderEvent,
  logThreatEvent,
  pushNotification,
} from "@/lib/securityService";
import { supabase } from "@/lib/supabase";

type Phase = "idle" | "scanning" | "result" | "intruder";

export default function FaceRecognizePage() {
  const { user } = useAuthStore();
  const { faceEmbeddings, trustedLocations, loadAll } = useDataStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const camRef = useRef<CameraHandle | null>(null);
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [capturedImg, setCapturedImg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!videoRef.current) return;
    setError(null);
    try {
      camRef.current = await startCamera(videoRef.current, "user");
      setActive(true);
      setPhase("idle");
    } catch {
      setError("Camera access denied. Allow camera permission to scan.");
    }
  }

  function stop() {
    camRef.current?.stop();
    camRef.current = null;
    setActive(false);
  }

  useEffect(() => () => stop(), []);

  async function scan() {
    if (!videoRef.current || !user) return;
    setPhase("scanning");
    setScanProgress(0);
    for (let p = 0; p <= 100; p += 10) {
      setScanProgress(p);
      await new Promise((r) => setTimeout(r, 60));
    }
    const img = await captureFromVideo(videoRef.current, 320);
    setCapturedImg(img);
    const embedding = generateEmbedding(img);
    const recognition = recognizeFace(embedding, faceEmbeddings);
    setResult(recognition);

    if (recognition.isAuthorized) {
      await logThreatEvent({
        user_id: user.id,
        event_type: "login_success",
        title: "Authorized face recognized",
        description: `Identity verified with ${(recognition.confidence * 100).toFixed(1)}% confidence.`,
        severity: "low",
        metadata: { confidence: recognition.confidence, pose: recognition.matchedPose },
      });
      setPhase("result");
    } else {
      // Intruder detection flow
      const [device, geo] = await Promise.all([getDeviceInfo(), getGeoInfo()]);
      const loc = geo
        ? isLocationTrusted(geo.latitude, geo.longitude, trustedLocations)
        : { trusted: false, nearest: undefined };
      const threatLevel = recognition.confidence < 0.3 ? "high" : "medium";
      const confidenceScore = 1 - recognition.confidence;
      await logIntruderEvent({
        user_id: user.id,
        photo_base64: img,
        latitude: geo?.latitude ?? null,
        longitude: geo?.longitude ?? null,
        location_label: loc.nearest
          ? `${loc.nearest.label} area`
          : "Unknown location",
        device_name: device.deviceName,
        phone_model: device.phoneModel,
        os_version: device.osVersion,
        network_type: device.networkType,
        wifi_status: device.wifiStatus,
        bluetooth_status: device.bluetoothStatus,
        battery_percentage: device.batteryPercentage,
        charging_status: device.chargingStatus,
        confidence_score: confidenceScore,
        threat_level: threatLevel,
      });
      await logThreatEvent({
        user_id: user.id,
        event_type: "intruder_capture",
        title: "Intruder detected",
        description: `Unknown face captured with ${(confidenceScore * 100).toFixed(1)}% anomaly confidence. Evidence stored.`,
        severity: threatLevel === "high" ? "high" : "medium",
        metadata: { confidence: confidenceScore, location: loc.nearest?.label },
      });
      await pushNotification({
        user_id: user.id,
        title: "Intruder Alert",
        message: "An unknown face was detected. Evidence has been captured and stored.",
        type: "danger",
      });
      await loadAll(user.id);
      setPhase("intruder");
    }
  }

  function reset() {
    setPhase("idle");
    setResult(null);
    setCapturedImg(null);
    setScanProgress(0);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Face Recognition</h1>
        <p className="mt-1 text-sm text-muted">
          Verify your identity or trigger intruder detection with real-time AI.
        </p>
      </div>

      {faceEmbeddings.length === 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-warning" />
            <div>
              <p className="text-sm font-medium text-white">
                No face embeddings enrolled
              </p>
              <p className="text-xs text-muted">
                Register your face first so the AI can recognize you.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Camera / scan view */}
        <Card>
          <SectionTitle title="Live Scanner" subtitle="Position your face in the frame" />
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-base-border bg-base-surface">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-cover transition-opacity ${
                active ? "opacity-100" : "opacity-0"
              }`}
            />
            {!active && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                  <ScanFace size={32} />
                </div>
                <p className="text-sm text-muted">Camera is off</p>
              </div>
            )}
            {active && phase !== "scanning" && phase !== "result" && phase !== "intruder" && (
              <>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-3/4 w-3/4 rounded-full border-2 border-accent/40" />
                </div>
                <motion.div
                  className="pointer-events-none absolute inset-x-0 h-0.5 bg-accent/60"
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
              </>
            )}
            {phase === "scanning" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-base-bg/60 backdrop-blur-sm">
                <motion.div
                  className="pointer-events-none absolute inset-x-0 h-1 bg-accent shadow-glow"
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <div className="h-3/4 w-3/4 rounded-full border-2 border-accent" />
                <div className="mt-6 w-48">
                  <div className="h-1.5 overflow-hidden rounded-full bg-base-elevated">
                    <motion.div
                      className="h-full rounded-full bg-accent"
                      animate={{ width: `${scanProgress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-center font-mono text-xs text-accent">
                    Analyzing… {scanProgress}%
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            {!active ? (
              <Button onClick={start} className="flex-1">
                <Camera size={16} />
                Start Camera
              </Button>
            ) : phase === "scanning" ? (
              <Button disabled className="flex-1">
                <Loader2 size={16} className="animate-spin" />
                Scanning…
              </Button>
            ) : (
              <>
                <Button
                  onClick={scan}
                  disabled={faceEmbeddings.length === 0}
                  className="flex-1"
                >
                  <ScanFace size={16} />
                  Run Recognition
                </Button>
                <Button variant="outline" onClick={stop}>
                  Stop
                </Button>
              </>
            )}
          </div>
          {error && (
            <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}
        </Card>

        {/* Result panel */}
        <Card>
          <SectionTitle title="Recognition Result" />
          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <Eye size={40} className="text-muted-faint" />
                <p className="mt-3 text-sm text-muted">
                  Run a scan to see the AI's verdict.
                </p>
              </motion.div>
            )}
            {phase === "scanning" && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <Spinner className="h-10 w-10" />
                <p className="mt-4 text-sm text-muted">
                  Comparing embedding against stored profile…
                </p>
              </motion.div>
            )}
            {phase === "result" && result && (
              <motion.div
                key="ok"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center"
              >
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success"
                >
                  <CheckCircle2 size={40} />
                </motion.div>
                <h2 className="mt-4 text-xl font-bold text-white">
                  Authorized User
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Identity verified successfully
                </p>
                <div className="mt-6 w-full space-y-3 text-left">
                  <ResultRow label="Confidence" value={`${(result.confidence * 100).toFixed(1)}%`} />
                  <ResultRow label="Matched Pose" value={result.matchedPose ?? "—"} />
                  <ResultRow label="Embeddings Compared" value={`${faceEmbeddings.length}`} />
                  <ResultRow label="Decision" value="Authorized" valueColor="#22C55E" />
                </div>
                <Button onClick={reset} variant="outline" className="mt-6 w-full">
                  Scan Again
                </Button>
              </motion.div>
            )}
            {phase === "intruder" && (
              <motion.div
                key="intruder"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center"
              >
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-danger/15 text-danger"
                >
                  <ShieldAlert size={40} />
                </motion.div>
                <h2 className="mt-4 text-xl font-bold text-white">
                  Intruder Detected
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Unknown face — evidence captured and logged
                </p>
                {capturedImg && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-danger/30">
                    <img
                      src={capturedImg}
                      alt="Intruder capture"
                      className="h-40 w-40 object-cover"
                    />
                  </div>
                )}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Badge color="danger">Evidence stored</Badge>
                  <Badge color="warning">Alert sent</Badge>
                  <Badge color="accent">GPS logged</Badge>
                </div>
                <Button onClick={reset} variant="outline" className="mt-6 w-full">
                  Run Another Scan
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-3">
          <ShieldCheck size={18} className="text-accent" />
          <p className="text-sm text-muted">
            {faceEmbeddings.length} enrolled embedding
            {faceEmbeddings.length === 1 ? "" : "s"}. The AI compares your live
            capture against all stored poses using cosine similarity over a
            128-dim feature vector.
          </p>
        </div>
      </Card>
    </div>
  );
}

function ResultRow({
  label,
  value,
  valueColor = "#fff",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-base-border bg-base-surface/40 px-3.5 py-2.5">
      <span className="text-xs text-muted">{label}</span>
      <span className="font-mono text-sm font-medium" style={{ color: valueColor }}>
        {value}
      </span>
    </div>
  );
}
