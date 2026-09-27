import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate("/onboarding"), 2600);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base-bg">
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="absolute inset-0 bg-grid-pattern bg-[size:50px_50px] opacity-30" />

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="absolute inset-0 animate-pulse-glow rounded-3xl" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-accent/15 text-accent shadow-glow-lg">
            <ShieldCheck size={52} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-6 text-center"
        >
          <h1 className="text-3xl font-bold tracking-tight text-white">
            iGuard<span className="text-accent"> Vault</span>
          </h1>
          <p className="mt-1.5 text-sm uppercase tracking-[0.3em] text-muted">
            AI Secure Vault
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mt-10 flex items-center gap-2"
        >
          <div className="h-1 w-32 overflow-hidden rounded-full bg-base-elevated">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-3 text-xs text-muted-faint"
        >
          Initializing security engine…
        </motion.p>
      </div>
    </div>
  );
}
