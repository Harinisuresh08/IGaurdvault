import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ScanFace, Brain, ChartBar as BarChart3, ArrowRight, Lock } from "lucide-react";

const slides = [
  { icon: Shield, title: "AI Secure Vault", desc: "Military-grade AES-256 encryption protects your documents, passwords, and cards — all encrypted on your device before they ever leave it.", color: "#00E5FF" },
  { icon: ScanFace, title: "AI Face Unlock", desc: "Register your face once with multi-angle capture. Every vault access is verified against encrypted embeddings using biometric matching.", color: "#22C55E" },
  { icon: Brain, title: "AI Decision Engine", desc: "Beyond face recognition — our engine analyzes location, device, time, behavior patterns, and login history to compute a real-time risk score.", color: "#F59E0B" },
  { icon: BarChart3, title: "Explainable Security", desc: "Every AI decision is explained. See your risk score, the reasons behind it, and actionable recommendations to improve your security posture.", color: "#8B5CF6" },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const SlideIcon = slides[step].icon;

  const next = () => {
    if (step < slides.length - 1) setStep(step + 1);
    else navigate("/auth/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-base-bg">
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8"
              style={{ background: `${slides[step].color}22`, border: `1px solid ${slides[step].color}44` }}
            >
              <SlideIcon className="w-12 h-12" style={{ color: slides[step].color }} strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">{slides[step].title}</h2>
            <p className="text-sm text-muted leading-relaxed">{slides[step].desc}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2 mt-12">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-accent" : "w-1.5 bg-base-border"}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between w-full mt-8">
          <button onClick={() => navigate("/auth/login")} className="text-sm text-muted hover:text-white transition-colors">
            Skip
          </button>
          <button
            onClick={next}
            className="inline-flex items-center gap-2 gradient-accent text-white px-6 py-2.5 rounded-xl text-sm font-medium shadow-glow hover:shadow-glow-lg transition-all"
          >
            {step === slides.length - 1 ? "Get Started" : "Next"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 pb-8 text-xs text-muted-faint">
        <Lock className="w-3 h-3" />
        <span>End-to-end encrypted · Zero-knowledge architecture</span>
      </div>
    </div>
  );
}
