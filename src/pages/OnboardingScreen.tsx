import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanFace,
  Activity,
  ShieldCheck,
  Lock,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui";

const SLIDES = [
  {
    icon: Lock,
    title: "AES-256 Encrypted Vault",
    desc: "iGuard AI Vault encrypts your documents, passwords, cards, notes, and IDs with military-grade AES-256 encryption. Your data is secured client-side — only you hold the key.",
    color: "#00E5FF",
  },
  {
    icon: ScanFace,
    title: "AI Face Recognition Unlock",
    desc: "Unlock your vault with advanced AI face verification. When an unknown face attempts access, the app automatically captures evidence and raises your risk score.",
    color: "#22C55E",
  },
  {
    icon: Activity,
    title: "Behavioral Anomaly Detection",
    desc: "ML models learn your vault access patterns and flag suspicious activity — unusual times, repeated failed unlocks, or access from unfamiliar locations.",
    color: "#F59E0B",
  },
  {
    icon: ShieldCheck,
    title: "Explainable Security Score",
    desc: "A clear 0–100 score with color-coded risk tiers. Every factor — password strength, vault lock state, behavior anomalies — is explained so you always know your posture.",
    color: "#FB7185",
  },
];

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const last = index === SLIDES.length - 1;

  const next = () => {
    if (last) navigate("/login");
    else setIndex((i) => i + 1);
  };

  const slide = SLIDES[index];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-base-bg px-6 py-10">
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-30" />

      <button
        onClick={() => navigate("/login")}
        className="absolute right-6 top-6 z-20 text-sm text-muted hover:text-white"
      >
        Skip
      </button>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <div className="relative mb-10 h-56 w-56">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div
                className="flex h-44 w-44 items-center justify-center rounded-[2rem] border shadow-glow-lg"
                style={{
                  background: `${slide.color}15`,
                  borderColor: `${slide.color}40`,
                  color: slide.color,
                }}
              >
                <slide.icon size={72} />
              </div>
            </motion.div>
          </AnimatePresence>
          {/* scanning rings */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-accent/20"
            animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold text-white">{slide.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {slide.desc}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-8 bg-accent" : "w-2 bg-base-elevated"
              }`}
            />
          ))}
        </div>

        <div className="mt-8 w-full">
          <Button onClick={next} size="lg" className="w-full">
            {last ? "Get Started" : "Continue"}
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
