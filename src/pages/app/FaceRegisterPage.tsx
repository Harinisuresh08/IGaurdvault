import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanFace,
  Camera,
  CheckCircle2,
  X,
  RotateCcw,
  ChevronRight,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Card, SectionTitle, Button, Badge, Spinner } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import { supabase } from "@/lib/supabase";
import { startCamera, captureFromVideo, type CameraHandle } from "@/lib/camera";
import { generateEmbedding } from "@/lib/faceEngine";
import { logThreatEvent } from "@/lib/securityService";
import clsx from "clsx";

const POSES = [
  { key: "front", label: "Front", hint: "Look straight at the camera" },
  { key: "left", label: "Left", hint: "Turn your head to the left" },
  { key: "right", label: "Right", hint: "Turn your head to the right" },
  { key: "up", label: "Up", hint: "Tilt your head up slightly" },
  { key: "down", label: "Down", hint: "Tilt your head down slightly" },
  { key: "smile", label: "Smile", hint: "Smile naturally" },
  { key: "eyes_closed", label: "Eyes Closed", hint: "Close your eyes briefly" },
  { key: "glasses", label: "With Glasses", hint: "Wear your glasses, if any" },
];

export default function FaceRegisterPage() {
  const { user } = useAuthStore();
  const { faceEmbeddings, loadAll } = useDataStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const camRef = useRef<CameraHandle | null>(null);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [captures, setCaptures] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enrolled = POSES.filter((p) => captures[p.key]).length;

  async function start() {
    if (!videoRef.current) return;
    setStarting(true);
    setError(null);
    try {
      camRef.current = await startCamera(videoRef.current, "user");
      setActive(true);
    } catch {
      setError(
        "Camera access denied. Please allow camera permission to enroll your face."
      );
    } finally {
      setStarting(false);
    }
  }

  function stop() {
    camRef.current?.stop();
    camRef.current = null;
    setActive(false);
  }

  useEffect(() => {
    return () => stop();
  }, []);

  async function capture() {
    if (!videoRef.current) return;
    const b64 = await captureFromVideo(videoRef.current, 320);
    setCaptures((c) => ({ ...c, [POSES[current].key]: b64 }));
    if (current < POSES.length - 1) setCurrent((c) => c + 1);
  }

  function retake(poseIndex: number) {
    const key = POSES[poseIndex].key;
    setCaptures((c) => {
      const next = { ...c };
      delete next[key];
      return next;
    });
    setCurrent(poseIndex);
  }

  async function saveAll() {
    if (!user) return;
    setSaving(true);
    try {
      const rows = Object.entries(captures).map(([pose, img]) => ({
        user_id: user.id,
        pose,
        image_base64: img,
        embedding: generateEmbedding(img),
        is_primary: pose === "front",
      }));
      const { error } = await supabase.from("face_embeddings").insert(rows);
      if (error) throw error;
      await logThreatEvent({
        user_id: user.id,
        type: "face_registered",
        title: "Face registration completed",
        description: `Enrolled ${rows.length} face captures for biometric authentication.`,
        severity: "info",
        metadata: { poses: rows.map((r) => r.pose) }
      });
      await loadAll(user.id);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md">
        <Card className="text-center">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success"
          >
            <CheckCircle2 size={32} />
          </motion.div>
          <h2 className="mt-4 text-xl font-bold text-white">
            Face Enrollment Complete
          </h2>
          <p className="mt-2 text-sm text-muted">
            {enrolled} face captures securely stored. Face recognition is now
            active for your account.
          </p>
          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setDone(false);
                setCaptures({});
                setCurrent(0);
              }}
            >
              Re-enroll
            </Button>
            <Button className="flex-1" onClick={() => (window.location.hash = "#/app/face/recognize")}>
              Test Recognition
              <ChevronRight size={16} />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Face Registration</h1>
        <p className="mt-1 text-sm text-muted">
          Capture multiple angles to build a robust biometric profile. Your
          embeddings are encrypted and stored securely.
        </p>
      </div>

      {faceEmbeddings.length > 0 && (
        <Card className="flex items-center gap-3 border-success/30 bg-success/5">
          <ShieldCheck size={20} className="text-success" />
          <p className="text-sm text-muted-light">
            You already have {faceEmbeddings.length} face capture
            {faceEmbeddings.length > 1 ? "s" : ""} enrolled. Re-enrolling will
            add more samples.
          </p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Camera */}
        <Card>
          <SectionTitle title="Camera" subtitle={POSES[current].hint} />
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-base-border bg-base-surface">
            <video
              ref={videoRef}
              playsInline
              muted
              className={clsx(
                "h-full w-full object-cover transition-opacity",
                active ? "opacity-100" : "opacity-0"
              )}
            />
            {!active && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                {starting ? (
                  <Spinner size={32} />
                ) : (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                      <ScanFace size={32} />
                    </div>
                    <p className="text-sm text-muted">Camera is off</p>
                  </>
                )}
              </div>
            )}
            {active && (
              <>
                {/* face guide */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-3/4 w-3/4 rounded-full border-2 border-accent/40" />
                </div>
                {/* scan line */}
                <motion.div
                  className="pointer-events-none absolute inset-x-0 h-0.5 bg-accent/60"
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
                <div className="absolute left-3 top-3">
                  <Badge color="success">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                    Live
                  </Badge>
                </div>
              </>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            {!active ? (
              <Button onClick={start} disabled={starting} className="flex-1">
                <Camera size={16} />
                Start Camera
              </Button>
            ) : (
              <>
                <Button onClick={capture} className="flex-1">
                  <Camera size={16} />
                  Capture {POSES[current].label}
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

        {/* Pose grid */}
        <Card>
          <SectionTitle
            title="Capture Progress"
            subtitle={`${enrolled} / ${POSES.length} poses`}
            action={
              <Badge color={enrolled === POSES.length ? "success" : "accent"}>
                {Math.round((enrolled / POSES.length) * 100)}%
              </Badge>
            }
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {POSES.map((p, i) => {
              const has = !!captures[p.key];
              return (
                <button
                  key={p.key}
                  onClick={() => setCurrent(i)}
                  className={clsx(
                    "group relative aspect-square overflow-hidden rounded-xl border transition-all",
                    has
                      ? "border-success/40"
                      : current === i
                      ? "border-accent"
                      : "border-base-border"
                  )}
                >
                  {has ? (
                    <img
                      src={captures[p.key]}
                      alt={p.label}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-base-surface">
                      <ScanFace size={18} className="text-muted-faint" />
                      <span className="text-[10px] text-muted">{p.label}</span>
                    </div>
                  )}
                  {has && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          retake(i);
                        }}
                        className="rounded-lg bg-base-bg/80 p-1.5 text-white"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCaptures((c) => {
                            const n = { ...c };
                            delete n[p.key];
                            return n;
                          });
                        }}
                        className="rounded-lg bg-base-bg/80 p-1.5 text-danger"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  {has && (
                    <div className="absolute right-1 top-1 rounded-full bg-success p-0.5">
                      <CheckCircle2 size={12} className="text-base-bg" />
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 border-t border-base-border pt-4">
            <Button
              onClick={saveAll}
              disabled={enrolled === 0 || saving}
              className="w-full"
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving embeddings…
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Save {enrolled} Embedding{enrolled === 1 ? "" : "s"}
                </>
              )}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-faint">
              We recommend capturing at least 5 poses for best accuracy.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
