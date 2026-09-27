import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Shield, ArrowRight, Eye, EyeOff, Fingerprint, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import { Button, Input } from "@/components/ui";
import { getDeviceInfo } from "@/lib/securityService";
import { FaceScanner } from "@/components/auth/FaceScanner";
import { compareEmbeddings } from "@/lib/faceDetectionService";
import { evaluateSecurityRisk } from "@/lib/aiDecisionEngine";
import type { RiskAssessment } from "@/types";

/* ── Floating particle ── */
function FloatingParticle({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <div
      className="absolute w-1 h-1 rounded-full bg-accent opacity-20"
      style={{
        left: `${x}%`, top: `${y}%`,
        animation: `float ${3 + Math.random() * 2}s ease-in-out ${delay}s infinite`,
      }}
    />
  );
}
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  x: Math.random() * 100, y: Math.random() * 100, delay: Math.random() * 3,
}));

type LoginStep = "email" | "face" | "password" | "blocked";

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, profile, loadProfile } = useAuthStore();
  const { addIntruderEvent, addSecurityEvent } = useDataStore();
  
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [failedFaceAttempts, setFailedFaceAttempts] = useState(0);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // In a real app, we verify the user exists and load their profile.
    await loadProfile("demo-user-123"); 
    setLoading(false);
    setStep("face");
  };

  const handleFaceComplete = async (scannedEmbedding: number[], photoBase64: string, liveness: any) => {
    if (!profile?.face_embedding) {
      setError("No registered face found. Please register first.");
      return;
    }
    
    const confidence = compareEmbeddings(profile.face_embedding, scannedEmbedding);
    const updatedFailedAttempts = confidence < 95 ? failedFaceAttempts + 1 : 0;
    setFailedFaceAttempts(updatedFailedAttempts);
    
    const input = {
      matchConfidence: confidence,
      liveness,
      loginTime: new Date(),
      isTrustedDevice: true, // Mocked as true for demo
      isTrustedLocation: true, // Mocked
      failedAttempts: updatedFailedAttempts,
    };
    
    const assessment = evaluateSecurityRisk(input);
    setRiskAssessment(assessment);
    
    // Log intruder event for low confidence matches or multiple failed attempts
    if (confidence < 95 || updatedFailedAttempts > 0) {
      addIntruderEvent({
        id: crypto.randomUUID(),
        user_id: profile.id,
        photo_base64: photoBase64,
        image_url: undefined,
        latitude: 37.77,
        longitude: -122.41,
        location_label: "Unknown Location",
        location: "Unknown Location",
        device_name: getDeviceInfo(),
        device_info: getDeviceInfo(),
        phone_model: "Unknown",
        os_version: "Unknown",
        network_type: (navigator as any).connection ? (navigator as any).connection.effectiveType : "unknown",
        wifi_status: "unknown",
        bluetooth_status: "unknown",
        battery_percentage: null,
        charging_status: "unknown",
        confidence_score: confidence,
        risk_score: assessment.score,
        failed_attempts: updatedFailedAttempts,
        threat_level: assessment.level,
        status: "new",
        ai_explanation: assessment.reasons.join(" "),
        ai_recommendations: assessment.recommendations,
        liveness_result: liveness.status,
        match_confidence: confidence,
        evidence: {},
        created_at: new Date().toISOString(),
      });
    }
    
    if (assessment.action === "block_access") {
      setStep("blocked");
    } else if (assessment.action === "require_pin" || assessment.action === "require_biometric") {
      setStep("password");
    } else {
      // Grant access
      await performFinalLogin();
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
      return;
    }
    await performFinalLogin();
  };

  const performFinalLogin = async () => {
    await signIn(email, password || "bypass-pin");
    addSecurityEvent({
      id: crypto.randomUUID(),
      user_id: "demo-user-123",
      event_type: "login_success",
      title: "Login Successful",
      description: `Signed in via Continuous Auth. Risk Score: ${riskAssessment?.score ?? 0}`,
      severity: "info",
      metadata: {},
      risk_score: riskAssessment?.score ?? 0,
      location: "San Francisco, CA",
      device_info: getDeviceInfo(),
      created_at: new Date().toISOString()
    });
    navigate("/app/dashboard");
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center mesh-bg px-4 overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-5" style={{ background: "#00E5FF", filter: "blur(80px)" }} />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-5" style={{ background: "#22C55E", filter: "blur(80px)" }} />
      {PARTICLES.map((p, i) => <FloatingParticle key={i} {...p} />)}

      <div className="relative w-full max-w-md z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="relative inline-flex mb-5">
            <div className="absolute inset-0 rounded-2xl animate-glow-pulse" style={{ background: "#00E5FF20" }} />
            <div className="relative w-20 h-20 rounded-2xl gradient-accent flex items-center justify-center shadow-glow">
              <Shield className="w-10 h-10 text-white" strokeWidth={2} />
            </div>
          </div>
          <h1 className="text-3xl font-black gradient-text mb-1">iGuard One</h1>
          <p className="text-sm text-muted">AI Personal Digital Guardian</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-strong rounded-3xl p-8 border border-base-border shadow-card">
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-danger/10 border border-danger/30 text-sm text-danger">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {step === "email" && (
              <motion.div key="email" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
                <p className="text-sm text-muted mb-6">Enter your email to continue</p>
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <Input label="Email address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required icon={<Mail className="w-4 h-4" />} autoFocus />
                  <Button type="submit" size="lg" className="w-full" loading={loading} iconRight={!loading ? <ArrowRight className="w-4 h-4" /> : undefined}>
                    Continue
                  </Button>
                </form>
                <p className="text-center text-sm text-muted mt-6">
                  Don't have an account? <Link to="/auth/register" className="text-accent hover:underline font-semibold">Create one free</Link>
                </p>
              </motion.div>
            )}

            {step === "face" && (
              <motion.div key="face" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <FaceScanner mode="verify" onComplete={handleFaceComplete} onError={(err) => setError(err)} />
                <Button variant="secondary" className="w-full mt-4" onClick={() => setStep("password")}>
                  Fallback to Password
                </Button>
              </motion.div>
            )}

            {step === "password" && (
              <motion.div key="password" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <h2 className="text-xl font-bold text-white mb-1">Verify Identity</h2>
                <p className="text-sm text-warning mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Additional verification required
                </p>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-light mb-1.5 block">Password</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input type={showPwd ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-base-surface border border-base-border rounded-xl px-4 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-muted-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all" autoFocus />
                      <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors">
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" size="lg" className="w-full" loading={loading} iconRight={!loading ? <ArrowRight className="w-4 h-4" /> : undefined}>
                    Sign In Securely
                  </Button>
                </form>
              </motion.div>
            )}

            {step === "blocked" && (
              <motion.div key="blocked" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-danger/20 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-danger" />
                </div>
                <h2 className="text-xl font-bold text-danger mb-2">Access Denied</h2>
                <p className="text-sm text-muted-light mb-6">
                  {riskAssessment?.reasons.join(" ")}
                </p>
                <p className="text-xs text-muted">
                  An intruder event has been logged and the device owner has been notified.
                </p>
                <Button variant="secondary" className="w-full mt-6" onClick={() => setStep("email")}>
                  Return to Start
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
