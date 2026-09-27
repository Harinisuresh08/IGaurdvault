import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  ChevronDown,
  ScanFace,
  ShieldAlert,
  Activity,
  MapPin,
  Bell,
  FileText,
  MessageSquare,
} from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";

const FAQ = [
  {
    q: "How does face recognition work?",
    a: "iGuard AI captures multiple angles of your face during registration and generates a 128-dimensional embedding for each. During recognition, a live capture is compared against all stored embeddings using cosine similarity. If the best match exceeds a confidence threshold, you're authorized; otherwise the capture is logged as an intruder with full forensic metadata.",
  },
  {
    q: "What is the security score based on?",
    a: "Your 0–100 score blends 11 factors: successful authentications, unknown faces, failed unlocks, unknown locations, suspicious login times, device motion, behavior anomalies, trusted networks, trusted devices, battery tampering, and charging status. Each factor contributes a weighted penalty, and the result is color-coded into Low, Medium, High, or Critical risk.",
  },
  {
    q: "How does behavioral anomaly detection work?",
    a: "Three ML models analyze your usage: Isolation Forest isolates outliers, One-Class SVM learns a boundary around normal behavior, and an Autoencoder flags high reconstruction error. They monitor unlock times, screen-on duration, motion, location, and repeated failures — each anomaly comes with an explanation and confidence percentage.",
  },
  {
    q: "What happens when an intruder is detected?",
    a: "iGuard AI captures a photo, GPS location, device metadata (model, OS, network, Wi-Fi, Bluetooth, battery, charging), and a confidence score. The evidence is stored securely, a threat event is logged, and a notification is pushed. In emergency mode, your emergency contact is also notified.",
  },
  {
    q: "What are trusted locations and devices?",
    a: "Trusted locations are safe zones (Home, Office, College) you define on a map. Authentication outside these zones increases your risk score. Trusted devices are Bluetooth peripherals and Wi-Fi networks you register; unknown devices near your phone also raise risk.",
  },
  {
    q: "Can I export my security data?",
    a: "Yes. The Reports screen generates professional PDF reports with your security score, threat timeline, intruder metadata, behavior analysis, and AI recommendations. Reports can be downloaded and shared.",
  },
];

const TOPICS = [
  { icon: ScanFace, label: "Face Recognition", desc: "Enrollment, recognition, intruder detection" },
  { icon: ShieldAlert, label: "Security Score", desc: "Risk factors, tiers, recommendations" },
  { icon: Activity, label: "Behavioral AI", desc: "Anomaly detection, ML models, explanations" },
  { icon: MapPin, label: "Trusted Zones", desc: "Locations, devices, safe areas" },
  { icon: Bell, label: "Alerts", desc: "Notifications, emergency mode" },
  { icon: FileText, label: "Reports", desc: "PDF generation, export, sharing" },
  { icon: MessageSquare, label: "AI Assistant", desc: "Chatbot, questions, insights" },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Help Center</h1>
        <p className="mt-1 text-sm text-muted">
          Everything you need to know about iGuard AI.
        </p>
      </div>

      <Card>
        <SectionTitle title="Topics" />
        <div className="grid gap-3 sm:grid-cols-2">
          {TOPICS.map((t) => (
            <div
              key={t.label}
              className="flex items-center gap-3 rounded-xl border border-base-border bg-base-surface/40 p-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <t.icon size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{t.label}</p>
                <p className="text-xs text-muted">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Frequently Asked Questions" />
        <div className="space-y-2">
          {FAQ.map((f, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-base-border bg-base-surface/40"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-white">
                  <HelpCircle size={15} className="text-accent" />
                  {f.q}
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-muted transition-transform ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-4 text-sm leading-relaxed text-muted-light">
                      {f.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </Card>

      <Card className="text-center">
        <p className="text-sm text-muted">Still need help?</p>
        <p className="mt-1 text-sm font-medium text-white">
          Ask the AI Assistant — it's trained on your security data.
        </p>
      </Card>
    </div>
  );
}
