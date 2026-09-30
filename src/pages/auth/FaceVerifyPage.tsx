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


/** Key stored in sessionStorage to indicate face was verified this session */
export const FACE_VERIFIED_KEY = "iguard_face_verified";

type Phase = "idle" | "scanning" | "authorized" | "intruder" | "checking" | "pin";

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
  const [pin, setPin] = useState("");
  const DEFAULT_PIN = "123456"; // Professional fallback PIN for demo

  // If already verified this session, skip straight to app
  useEffect(() => {
    if (sessionStorage.getItem(FACE_VERIFIED_KEY) === "1") {
      navigate("/app/dashboard", { replace: true });
    }
  }, [navigate]);

  // Load embeddings once user is known
  useEffect(() => {
    if (user) {
      loadAll(user.id).then(() => {
        setDataReady(true);
      });
    }
  }, [user, loadAll]);

  // Auto-start camera when data is ready
  useEffect(() => {
    if (dataReady && !active && phase === "idle" && faceEmbeddings.length > 0) {
      startCam();
    }
  }, [dataReady, active, phase, faceEmbeddings.length]);

  // Auto-scan after camera starts
  useEffect(() => {
    if (active && faceEmbeddings.length > 0 && phase === "idle") {
      const timer = setTimeout(() => {
        scan();
      }, 2000); // 2 second delay for camera auto-exposure
      return () => clearTimeout(timer);
    }
  }, [active, faceEmbeddings.length, phase]);

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
    setScanProgress(90);
    
    try {
      const embedding = await generateEmbedding(img);
      setScanProgress(100);

      if (!embedding) {
        throw new Error("No face detected in the frame. Please align your face and ensure good lighting.");
      }

      console.log('[FaceVerifyPage] Candidate embedding generated, dims:', embedding.length);
      console.log('[FaceVerifyPage] Stored embeddings count:', faceEmbeddings.length);
      // Log the raw format of the first stored embedding to diagnose JSONB issues
      if (faceEmbeddings.length > 0) {
        const rawEmb = faceEmbeddings[0]?.embedding;
        console.log('[FaceVerifyPage] First stored embedding type:', typeof rawEmb, Array.isArray(rawEmb) ? 'isArray len=' + (rawEmb as any[]).length : 'NOT array', rawEmb);
      }

      const recognition = recognizeFace(embedding, faceEmbeddings);
      console.log('[FaceVerifyPage] Recognition result:', recognition);

      if (recognition.isAuthorized) {
        await logThreatEvent({
          user_id: user.id,
          event_type: "face_match",
          title: "Face Verified — Access Granted",
          description: `Identity verified with ${(recognition.confidence * 100).toFixed(1)}% confidence. Distance: ${recognition.bestDistance?.toFixed(4)}.`,
          severity: "low",
          metadata: { confidence: recognition.confidence, pose: recognition.matchedPose, distance: recognition.bestDistance },
        });
        sessionStorage.setItem(FACE_VERIFIED_KEY, "1");
        setPhase("authorized");
      } else {
        // Only log intruder event when comparison genuinely fails (not when embeddings are unreadable)
        const [device, geo] = await Promise.all([getDeviceInfo(), getGeoInfo()]);
        // Use bestDistance to determine threat level: very high distance = high threat
        const dist = recognition.bestDistance ?? Infinity;
        const threatLevel = dist > 0.9 ? "high" : "medium";
        const confidenceScore = recognition.confidence;

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
          confidence_score: 1 - confidenceScore,
          threat_level: threatLevel,
        });
        await logThreatEvent({
          user_id: user.id,
          event_type: "intruder_capture",
          title: "Unrecognized Face — Access Denied",
          description: `Unknown face at login. Best distance: ${dist.toFixed(4)} (threshold 0.6).`,
          severity: threatLevel === "high" ? "high" : "medium",
          metadata: { bestDistance: dist, confidence: confidenceScore },
        });
        await pushNotification({
          user_id: user.id,
          title: "Intruder Alert!",
          message: "An unrecognized face attempted to access your vault. Evidence has been captured.",
          type: "danger",
        });
        setPhase("intruder");
      }
    } catch (err) {
      setError((err as Error).message);
      setPhase("idle");
    }
  }

  function togglePin() {
    stopCam();
    setPhase("pin");
    setError(null);
  }

  function handlePinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, "");
    if (val.length <= 6) setPin(val);
    if (val.length === 6) {
      if (val === DEFAULT_PIN) {
        sessionStorage.setItem(FACE_VERIFIED_KEY, "1");
        navigate("/app/dashboard", { replace: true });
      } else {
        setError("Invalid PIN. Please try again.");
        setPin("");
      }
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
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent shadow-inner">
                  <ScanFace className="w-8 h-8 animate-pulse" />
                </div>
                <p className="text-sm text-muted">Ready for scan</p>
              </div>
            )}

            {/* PIN Entry overlay */}
            {phase === "pin" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-base-surface">
                <div className="text-center mb-6 max-w-[200px]">
                  <h3 className="text-xl text-white font-bold mb-2">Enter PIN</h3>
                  <p className="text-xs text-muted">A valid master PIN bypasses the recognition layer.</p>
                </div>
                <div className="flex gap-2">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i}
                      className={`w-10 h-12 rounded-xl flex items-center justify-center text-xl font-bold border-2 transition-all ${pin.length > i ? 'border-accent bg-accent/20 text-white shadow-[0_0_15px_rgba(var(--color-accent),0.3)]' : 'border-base-border bg-base-elevated text-transparent'}`}
                    >
                      {pin.length > i ? '•' : ''}
                    </div>
                  ))}
                </div>
                <input
                  type="password"
                  value={pin}
                  onChange={handlePinChange}
                  autoFocus
                  className="absolute opacity-0 w-full h-full cursor-text"
                  maxLength={6}
                />
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
                <button
                  onClick={togglePin}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 text-accent text-sm font-medium hover:underline transition-all mt-2"
                >
                  Use Backup PIN
                </button>
              </motion.div>
            )}

            {phase === "pin" && (
              <motion.div key="pin-btns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <button
                  onClick={retry}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-base-border text-muted-light text-sm hover:text-white hover:bg-base-elevated transition-all"
                >
                  Back to Face Scan
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {(phase === "idle" || phase === "scanning") && (
             <div className="mt-4 pt-4 border-t border-base-border/50 text-center">
                 <button onClick={togglePin} className="text-xs text-muted hover:text-accent transition-colors font-medium">Having Trouble? Use Backup PIN</button>
             </div>
          )}

          {/* Info footer */}
          <p className="text-center text-xs text-muted-faint pt-1">
            {faceEmbeddings.length} face embedding{faceEmbeddings.length !== 1 ? "s" : ""} enrolled · Comparison uses cosine similarity
          </p>
        </div>
      </motion.div>
    </div>
  );
}
