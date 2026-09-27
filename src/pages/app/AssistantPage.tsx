import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  Trash2,
  Lightbulb,
} from "lucide-react";
import { Card, Button, Spinner } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import { logChatMessage } from "@/lib/securityService";
import { supabase } from "@/lib/supabase";
import {
  computeSecurityScore,
  labelForTier,
  buildRiskSummary,
} from "@/lib/securityEngine";

const SUGGESTED = [
  "Why is my security score low?",
  "Show today's alerts",
  "Explain anomaly detection",
  "How can I improve my security?",
  "How many intruders were detected?",
];

export default function AssistantPage() {
  const { user } = useAuthStore();
  const data = useDataStore();
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [data.chatMessages, thinking]);

  async function send(text: string) {
    if (!user || !text.trim()) return;
    const content = text.trim();
    setInput("");
    setThinking(true);
    await logChatMessage({ user_id: user.id, role: "user", content });

    const reply = generateReply(content, data);

    setTimeout(async () => {
      setThinking(false);
      await logChatMessage({ user_id: user.id, role: "assistant", content: reply.text, metadata: { sources: reply.sources } });
    }, 700 + Math.random() * 500);
  }

  async function clearChat() {
    if (!user) return;
    await supabase.from("chat_messages").delete().eq("user_id", user.id);
    await data.loadAll(user.id);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Security Assistant</h1>
          <p className="mt-1 text-sm text-muted">
            Ask questions about your security posture — answers are based on
            your real activity data.
          </p>
        </div>
        {data.chatMessages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat}>
            <Trash2 size={14} />
            Clear
          </Button>
        )}
      </div>

      <Card className="flex flex-1 flex-col p-0">
        <div
          ref={scrollRef}
          className="scrollbar-hide flex-1 space-y-4 overflow-y-auto p-5"
        >
          {data.chatMessages.length === 0 && !thinking && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent"
              >
                <Bot size={32} />
              </motion.div>
              <p className="mt-4 text-sm font-semibold text-white">
                Hello! I'm your AI security assistant.
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted">
                Ask me about your security score, recent alerts, anomaly
                detection, or how to improve your protection.
              </p>
            </div>
          )}

          {data.chatMessages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  m.role === "user"
                    ? "bg-base-elevated text-muted-light"
                    : "bg-accent/15 text-accent"
                }`}
              >
                {m.role === "user" ? <UserIcon size={16} /> : <Bot size={16} />}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-accent text-base-bg"
                    : "bg-base-elevated text-muted-light"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </motion.div>
          ))}

          {thinking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Bot size={16} />
              </div>
              <div className="flex items-center gap-1 rounded-2xl bg-base-elevated px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-2 w-2 rounded-full bg-accent"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {data.chatMessages.length === 0 && (
          <div className="border-t border-base-border p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs text-muted">
              <Lightbulb size={12} className="text-warning" />
              Try asking:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-base-border bg-base-surface px-3 py-1.5 text-xs text-muted-light transition-colors hover:border-accent/40 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-base-border p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your security…"
            className="flex-1 rounded-xl border border-base-border bg-base-surface px-4 py-2.5 text-sm text-white placeholder:text-muted-faint focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <Button type="submit" size="md" disabled={!input.trim() || thinking}>
            <Send size={16} />
          </Button>
        </form>
      </Card>
    </div>
  );
}

function generateReply(
  question: string,
  data: ReturnType<typeof useDataStore.getState>
): { text: string; sources: string[] } {
  const q = question.toLowerCase();
  const score = computeSecurityScore({
    successfulAuths: data.threatEvents.filter((e) => e.event_type === "login_success").length,
    unknownFaces: data.threatEvents.filter((e) => e.event_type === "unknown_face").length,
    failedAttempts: data.threatEvents.filter((e) => e.event_type === "login_failed").length,
    unknownLocations: 0,
    suspiciousLoginTime: false,
    deviceMotion: 0.2,
    behaviorAnomaly: data.behaviorSamples.filter((b) => b.anomaly_label !== "normal").length * 0.2,
    trustedNetwork: data.trustedDevices.some((d) => d.device_type === "wifi" && d.is_active),
    trustedDevice: data.trustedDevices.some((d) => d.device_type === "bluetooth" && d.is_active),
    batteryTampering: false,
    chargingStatus: "Unknown",
  });
  const summary = buildRiskSummary(
    data.scoreLogs,
    data.threatEvents,
    data.intruderEvents,
    data.behaviorSamples,
    data.trustedLocations
  );
  const currentTier = (score.tier ?? score.level ?? "safe") as any;
  const recommendations = score.recommendations ?? [];

  if (q.includes("score") && (q.includes("low") || q.includes("why"))) {
    const topFactors = score.factors
      .filter((f) => (f.value ?? f.penalty ?? 0) > 3)
      .sort((a, b) => (b.value ?? b.penalty ?? 0) - (a.value ?? a.penalty ?? 0))
      .slice(0, 3);
    return {
      text: `Your security score is ${score.score} (${labelForTier(currentTier)}). The main factors lowering it are:\n\n${topFactors
        .map((f) => `• ${f.label}: -${(f.value ?? f.penalty ?? 0).toFixed(0)} pts — ${f.reason ?? f.detail}`)
        .join("\n")}\n\nRecommendations:\n${recommendations.map((r) => `• ${r}`).join("\n")}`,
      sources: ["security_engine", "risk_summary"],
    };
  }
  if (q.includes("today") || q.includes("alert")) {
    const today = data.threatEvents.filter((e) => {
      return new Date(e.created_at).toDateString() === new Date().toDateString();
    });
    if (today.length === 0)
      return {
        text: "No security alerts today. Your device has been quiet — that's a good sign.",
        sources: ["threat_events"],
      };
    return {
      text: `You have ${today.length} alert(s) today:\n\n${today
        .slice(0, 6)
        .map((e) => `• ${e.title} — ${e.severity}`)
        .join("\n")}`,
      sources: ["threat_events"],
    };
  }
  if (q.includes("anomaly") || q.includes("behavior") || q.includes("detection")) {
    return {
      text: `iGuard AI uses three models for behavioral anomaly detection:\n\n• Isolation Forest — isolates outliers in random trees\n• One-Class SVM — learns a boundary around normal behavior\n• Autoencoder — flags high reconstruction error\n\nSo far, ${summary.behaviorAnomalies} anomaly/anomalies have been detected across ${data.behaviorSamples.length} samples. Each anomaly is explained with a confidence percentage and the specific signals that triggered it.`,
      sources: ["behavior_samples", "ml_models"],
    };
  }
  if (q.includes("improve") || q.includes("better") || q.includes("protect")) {
    return {
      text: `Here's how to improve your security:\n\n${recommendations
        .map((r) => `• ${r}`)
        .join("\n")}\n\n• Enroll more face angles for better recognition\n• Add trusted locations (Home, Office)\n• Register trusted Bluetooth/Wi-Fi devices\n• Keep emergency mode enabled`,
      sources: ["security_engine"],
    };
  }
  if (q.includes("intruder") || q.includes("unknown")) {
    return {
      text: `${summary.intruderCount} intruder capture(s) have been recorded. Each includes photo, GPS, device metadata, network info, battery state, and a confidence score. You can review them in the Intruder Gallery.`,
      sources: ["intruder_events"],
    };
  }
  return {
    text: `I can help with your security posture. Your current score is ${score.score} (${labelForTier(currentTier)}). You have ${summary.totalEvents} tracked events, ${summary.intruderCount} intruders, and ${summary.behaviorAnomalies} behavior anomalies. Ask me about your score, alerts, anomalies, or how to improve.`,
    sources: ["security_engine", "risk_summary"],
  };
}
