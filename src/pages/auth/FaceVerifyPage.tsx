import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanFace,
  Camera,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Shield,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import { startCamera, captureFromVideo, type CameraHandle } from "@/lib/camera";
import { generateEmbedding, recognizeFace } from "@/lib/faceEngine";
import { logIntruderEvent, logThreatEvent, pushNotification } from "@/lib/securityService";
import { getDeviceInfo, getGeoInfo } from "@/lib/device";
import { isLocationTrusted } from "@/lib/securityEngine";
import { supabase } from "@/lib/supabase";
import { generateEmbedding as genEmbed } from "@/lib/faceEngine";

/** Key stored in sessionStorage to indicate face was verified this session */
export const FACE_VERIFIED_KEY = "iguard_face_verified";

type Phase = "idle" | "scanning" | "authorized" | "intruder" | "checking";

export default function FaceVerifyPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const { faceEmbeddings, loadAll } = useDataStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const camRef = useRef<CameraHandle | null>(null);

  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [scanProgress, setScanProgress] = useState(0);
  const [capturedImg, setCapturedImg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataReady, setDataReady] = useState(false);

  // If already verified this session, skip straight to app
  useEffect(() => {
    if (sessionStorage.getItem(FACE_VERIFIED_KEY) === "1") {
      navigate("/app/dashboard", { replace: true });
    }
  }, [navigate]);

  // Load embeddings once user is known
  useEffect(() => {
    if (user) {
      loadAll(user.id).then(() => setDataReady(true));
    }
  }, [user, loadAll]);

  async function startCam() {
    if (!videoRef.current) return;
    setError(null);
    try {
      camRef.current = await startCamera(videoRef.current, "user");
      setActive(true);
      setPhase("idle");
    } catch {
      setError("Camera access denied. Please allow camera permission to verify your face.");
    }
  }

  function stopCam() {
    camRef.current?.stop();
    camRef.current = null;
    setActive(false);
  }

  useEffect(() => () => stopCam(), []);

  async function scan() {
    if (!videoRef.current || !user) return;
    setPhase("scanning");
    setScanProgress(0);

    // Animate progress bar
    for (let p = 0; p <= 100; p += 10) {
      setScanProgress(p);
      await new Promise((r) => setTimeout(r, 60));
    }

    const img = await captureFromVideo(videoRef.current, 320);
    setCapturedImg(img);
    const embedding = generateEmbedding(img);
    const recognition = recognizeFace(embedding, faceEmbeddings);

    if (recognition.isAuthorized) {
      await logThreatEvent({
        user_id: user.id,
        event_type: "face_match",
        title: "Face Verified — Access Granted",
        description: `Identity verified with ${(recognition.confidence * 100).toFixed(1)}% confidence.`,
        severity: "low",
        metadata: { confidence: recognition.confidence, pose: recognition.matchedPose },
      });
      sessionStorage.setItem(FACE_VERIFIED_KEY, "1");
      setPhase("authorized");
    } else {
      // Intruder detection
      const [device, geo] = await Promise.all([getDeviceInfo(), getGeoInfo()]);
      const loc = geo
        ? isLocationTrusted(geo.latitude, geo.longitude, [])
        : { trusted: false, nearest: undefined };
      const threatLevel = recognition.confidence < 0.3 ? "high" : "medium";
      const confidenceScore = 1 - recognition.confidence;

      await logIntruderEvent({
        user_id: user.id,
        photo_base64: img,
        latitude: geo?.latitude ?? null,
        longitude: geo?.longitude ?? null,
        location_label: "Unknown location",
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
        title: "Unrecognized Face — Access Denied",
        description: `Unknown face at login with ${(confidenceScore * 100).toFixed(1)}% anomaly confidence.`,
        severity: threatLevel === "high" ? "high" : "medium",
        metadata: { confidence: confidenceScore },
      });
      await pushNotification({
        user_id: user.id,
        title: "Intruder Alert!",
        message: "An unrecognized face attempted to access your vault. Evidence has been captured.",
        type: "danger",
      });
      setPhase("intruder");
    }
  }

  function enterAnyway() {
    // No embeddings registered — allow entry and prompt to register
    sessionStorage.setItem(FACE_VERIFIED_KEY, "1");
    navigate("/app/dashboard", { replace: true });
  }

  function proceedToDashboard() {
    navigate("/app/dashboard", { replace: true });
  }

  function retry() {
    setPhase("idle");
    setCapturedImg(null);
    setScanProgress(0);
  }

  const hasEmbeddings = faceEmbeddings.length > 0;

  /* ── No face registered yet ─────────────────────────────────────── */
  if (dataReady && !hasEmbeddings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-bg px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 rounded-2xl gradient-accent items-center justify-center shadow-glow mb-4">
              <ScanFace className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Face ID Not Set Up</h1>
            <p className="text-sm text-muted mt-2">
              You haven't registered your face yet. Register now to enable biometric protection, or skip to set it up later.
            </p>
          </div>
          <div className="glass rounded-2xl p-6 space-y-3">
            <button
              onClick={() => {
                sessionStorage.setItem(FACE_VERIFIED_KEY, "1");
                navigate("/app/face/register", { replace: true });
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-all shadow-glow"
            >
              <ScanFace className="w-4 h-4" /> Register Face Now
            </button>
            <button
              onClick={enterAnyway}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-base-border text-muted-light text-sm hover:text-white hover:bg-base-elevated transition-all"
            >
              <ArrowRight className="w-4 h-4" /> Skip for Now
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── Main face verify UI ─────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-bg px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 rounded-2xl gradient-accent items-center justify-center shadow-glow mb-4">
            <Shield className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-white">Identity Verification</h1>
          <p className="text-sm text-muted mt-1">
            Face recognition required to access your vault
          </p>
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          {/* Camera viewport */}
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-base-border bg-base-surface">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-cover transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
            />

            {/* Idle placeholder */}
            {!active && phase === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                  <ScanFace className="w-8 h-8" />
                </div>
                <p className="text-sm text-muted">Camera is off</p>
              </div>
            )}

            {/* Face guide overlay */}
            {active && phase === "idle" && (
              <>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-3/4 w-3/4 rounded-full border-2 border-accent/50" />
                </div>
                <motion.div
                  className="pointer-events-none absolute inset-x-0 h-0.5 bg-accent/60"
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
                <div className="absolute left-3 top-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-success/20 border border-success/30 text-xs text-success font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    Live
                  </span>
                </div>
              </>
            )}

            {/* Scanning overlay */}
            {phase === "scanning" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-base-bg/70 backdrop-blur-sm">
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
                    Scanning… {scanProgress}%
                  </p>
                </div>
              </div>
            )}

            {/* Authorized overlay */}
            {phase === "authorized" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-success/10 backdrop-blur-sm gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 15 }}
                >
                  <CheckCircle2 className="w-16 h-16 text-success" />
                </motion.div>
                <p className="text-sm font-semibold text-success">Identity Verified!</p>
              </div>
            )}

            {/* Intruder overlay */}
            {phase === "intruder" && capturedImg && (
              <div className="absolute inset-0">
                <img src={capturedImg} alt="Captured" className="h-full w-full object-cover opacity-40" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-danger/20">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                    <ShieldAlert className="w-16 h-16 text-danger" />
                  </motion.div>
                  <p className="text-sm font-semibold text-danger">Face Not Recognized</p>
                </div>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-danger-soft border border-danger/30 text-sm text-danger">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.div key="idle-btns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                {!active ? (
                  <button
                    onClick={startCam}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-all shadow-glow"
                  >
                    <Camera className="w-4 h-4" /> Start Camera
                  </button>
                ) : (
                  <button
                    onClick={scan}
                    disabled={!hasEmbeddings}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-glow"
                  >
                    <ScanFace className="w-4 h-4" /> Verify My Face
                  </button>
                )}
              </motion.div>
            )}

            {phase === "scanning" && (
              <motion.div key="scanning-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <button disabled className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent/50 text-white text-sm cursor-not-allowed">
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing…
                </button>
              </motion.div>
            )}

            {phase === "authorized" && (
              <motion.div key="authorized-btns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <button
                  onClick={proceedToDashboard}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-success text-white font-semibold text-sm hover:bg-success/90 transition-all"
                >
                  <ArrowRight className="w-4 h-4" /> Enter Vault
                </button>
              </motion.div>
            )}

            {phase === "intruder" && (
              <motion.div key="intruder-btns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                <p className="text-xs text-center text-danger font-medium">
                  ⚠ Evidence has been captured and saved. You cannot enter.
                </p>
                <button
                  onClick={retry}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-base-border text-muted-light text-sm hover:text-white hover:bg-base-elevated transition-all"
                >
                  Try Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info footer */}
          <p className="text-center text-xs text-muted-faint pt-1">
            {faceEmbeddings.length} face embedding{faceEmbeddings.length !== 1 ? "s" : ""} enrolled · Comparison uses cosine similarity
          </p>
        </div>
      </motion.div>
    </div>
  );
}
