import { Shield, ScanFace, Brain, Lock, KeyRound, Eye, TriangleAlert as AlertTriangle, Bell, Zap, Download, Clock, Cpu, Cloud } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Badge } from "@/components/ui";

export default function AboutPage() {
  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <PageHeader title="About iGuard One" subtitle="AI Personal Digital Guardian" />

      <Card className="mb-4 text-center">
        <div className="inline-flex w-20 h-20 rounded-3xl gradient-accent items-center justify-center shadow-glow-lg mb-4">
          <Shield className="w-10 h-10 text-white" strokeWidth={2.5} />
        </div>
        <h2 className="text-2xl font-bold gradient-text">iGuard One</h2>
        <p className="text-sm text-muted mt-1">Protecting Your Digital Life with Artificial Intelligence</p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Badge color="#00E5FF">Version 1.0.0</Badge>
          <Badge color="#22C55E">AES-256 Encrypted</Badge>
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-white mb-3">Mission</h3>
        <p className="text-sm text-muted-light leading-relaxed">
          iGuard One is not just a password manager or a secure vault. It is an AI-powered Digital Guardian that
          intelligently protects, monitors, analyzes, and recommends security improvements for your digital life.
          Using advanced machine learning algorithms, it evaluates your security posture in real-time and provides
          explainable AI decisions for every action.
        </p>
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-white mb-3">Key Features</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Feature icon={<ScanFace className="w-4 h-4" />} title="AI Face Unlock" desc="Multi-angle face registration with encrypted embeddings" color="#00E5FF" />
          <Feature icon={<Brain className="w-4 h-4" />} title="AI Decision Engine" desc="Real-time risk scoring with 10+ factors" color="#22C55E" />
          <Feature icon={<Lock className="w-4 h-4" />} title="AES-256 Vault" desc="Military-grade encryption for all sensitive data" color="#F59E0B" />
          <Feature icon={<KeyRound className="w-4 h-4" />} title="Password Manager" desc="AI-powered password health monitoring" color="#EF4444" />
          <Feature icon={<AlertTriangle className="w-4 h-4" />} title="Intruder Protection" desc="Capture and analyze unauthorized access" color="#F97316" />
          <Feature icon={<Eye className="w-4 h-4" />} title="Explainable AI" desc="Every decision explained with reasons" color="#8B5CF6" />
          <Feature icon={<Zap className="w-4 h-4" />} title="AI Recommendations" desc="Personalized security improvement tips" color="#06B6D4" />
          <Feature icon={<Bell className="w-4 h-4" />} title="Smart Alerts" desc="Proactive notifications for threats" color="#EC4899" />
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-white mb-3">Technology</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TechRow icon={<Cpu className="w-4 h-4" />} label="AI Engine" value="Isolation Forest + One-Class SVM" />
          <TechRow icon={<Lock className="w-4 h-4" />} label="Encryption" value="AES-256-GCM + PBKDF2" />
          <TechRow icon={<Cloud className="w-4 h-4" />} label="Backend" value="Supabase + PostgreSQL" />
          <TechRow icon={<Shield className="w-4 h-4" />} label="Security" value="RLS + Zero-knowledge" />
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-white mb-3">Privacy</h3>
        <p className="text-sm text-muted-light leading-relaxed">
          Your sensitive data is encrypted on your device before it ever leaves. The server only stores encrypted
          ciphertext — even if the database is compromised, your data remains unreadable without your PIN.
          Face embeddings are similarly encrypted and never shared in plaintext.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-success" />
          <span className="text-xs text-muted">Zero-knowledge architecture · End-to-end encrypted</span>
        </div>
      </Card>
    </div>
  );
}

function Feature({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-base-surface">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}22` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div><p className="text-sm font-medium text-white">{title}</p><p className="text-xs text-muted mt-0.5">{desc}</p></div>
    </div>
  );
}

function TechRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-base-surface">
      <div className="text-muted">{icon}</div>
      <div><p className="text-xs text-muted">{label}</p><p className="text-sm text-white">{value}</p></div>
    </div>
  );
}
