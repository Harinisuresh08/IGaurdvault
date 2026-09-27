import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ScanFace, Activity, Lock } from "lucide-react";

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base-bg px-4 py-10">
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-40" />

      {/* Floating orbs */}
      <motion.div
        className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute right-1/4 bottom-1/4 h-72 w-72 rounded-full bg-accent/5 blur-3xl"
        animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-base-border bg-base-card/60 backdrop-blur-2xl lg:grid-cols-2">
        {/* Brand side */}
        <div className="hidden flex-col justify-between border-r border-base-border bg-base-surface/50 p-10 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent shadow-glow">
              <ShieldCheck size={26} />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-white">
                iGuard<span className="text-accent"> AI</span>
              </p>
              <p className="text-xs uppercase tracking-widest text-muted">
                Intelligent Security
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <Feature
              icon={<ScanFace size={18} />}
              title="AI Face Recognition"
              desc="Detect authorized users and flag intruders in real time."
            />
            <Feature
              icon={<Activity size={18} />}
              title="Behavioral Anomaly Detection"
              desc="Isolation Forest, One-Class SVM & Autoencoder models track usage."
            />
            <Feature
              icon={<Lock size={18} />}
              title="Explainable Risk Scoring"
              desc="A 0–100 security score with clear, actionable explanations."
            />
          </div>

          <p className="text-xs text-muted-faint">
            Trusted, encrypted, on-device. Your security, intelligently automated.
          </p>
        </div>

        {/* Form side */}
        <div className="p-8 sm:p-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <ShieldCheck size={22} />
              </div>
              <p className="text-lg font-bold text-white">
                iGuard<span className="text-accent"> AI</span>
              </p>
            </div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm text-muted">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-base-elevated text-accent">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-muted">{desc}</p>
      </div>
    </div>
  );
}
