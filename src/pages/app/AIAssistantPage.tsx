import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Shield, KeyRound, Lock, TriangleAlert as AlertTriangle, Brain, Zap, Lightbulb, User } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import { logChatMessage } from "@/lib/securityService";
import { computeSecurityScore, generateInsights } from "@/lib/securityEngine";
import { detectDuplicates } from "@/lib/vaultService";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui";
import type { ChatMessage } from "@/types";

const SUGGESTIONS = [
  "What's my security score?",
  "Are my passwords safe?",
  "How can I improve my security?",
  "Any threats I should know about?",
  "What should I do about weak passwords?",
];

export default function AIAssistantPage() {
  const { user } = useAuthStore();
  const { chatMessages, passwordEntries, vaultItems, intruderEvents, behaviorSamples, recommendations } = useDataStore();
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, typing]);

  const generateResponse = (query: string): string => {
    const q = query.toLowerCase();
    const weak = passwordEntries.filter((p) => p.is_weak);
    const dups = detectDuplicates(passwordEntries);
    const dupCount = passwordEntries.filter((p) => dups.has(p.id)).length;
    const recentIntruders = intruderEvents.filter((i) => (Date.now() - new Date(i.created_at).getTime()) / 86400000 <= 7).length;
    const behaviorAnomaly = behaviorSamples.length > 5 ? behaviorSamples.filter((s) => s.anomaly_label === "anomaly").length / behaviorSamples.length : 0;

    const score = computeSecurityScore({
      faceMatched: true, faceConfidence: 0.95, isTrustedLocation: true, isTrustedDevice: true,
      failedAttempts: 0, hasWeakPasswords: weak.length > 0, hasDuplicatePasswords: dupCount > 0,
      recentIntruders, backupCompletedDays: null, behaviorAnomaly, hourOfDay: new Date().getHours(),
    });

    if (q.includes("score") || q.includes("security score") || q.includes("how secure")) {
      return `Your current AI Security Score is **${score.score}/100** (${score.level} risk level).\n\nKey factors:\n${score.factors.map((f) => `• ${f.label}: ${f.detail}`).join("\n")}\n\n${score.score >= 80 ? "Excellent! Your security posture is strong." : score.score >= 60 ? "Good, but there's room for improvement." : "Your security needs attention. Please review the recommendations."}`;
    }

    if (q.includes("password") && (q.includes("safe") || q.includes("secure") || q.includes("weak") || q.includes("strength"))) {
      return `You have **${passwordEntries.length}** saved passwords.\n\n• Weak passwords: ${weak.length}\n• Duplicate passwords: ${dupCount}\n• Average strength: ${passwordEntries.length > 0 ? Math.round(passwordEntries.reduce((a, p) => a + p.strength_score, 0) / passwordEntries.length) : 0}%\n\n${weak.length > 0 ? `**Action needed:** ${weak.length} password(s) need updating. Use the Password Manager to generate stronger alternatives.` : "All passwords meet strength requirements."}`;
    }

    if (q.includes("improve") || q.includes("recommend") || q.includes("better") || q.includes("advice")) {
      const insights = generateInsights({
        vaultItemCount: vaultItems.length, passwordCount: passwordEntries.length,
        weakPasswords: weak.length, duplicatePasswords: dupCount,
        recentIntruders, securityScore: score.score, backupDays: null, expiringItems: 0,
      });
      if (insights.length === 0) return "Your security posture is excellent! Keep maintaining strong passwords, regular backups, and monitoring your vault activity.";
      return `Here are my recommendations to improve your security:\n\n${insights.map((i) => `**${i.title}**\n${i.message}`).join("\n\n")}`;
    }

    if (q.includes("threat") || q.includes("danger") || q.includes("risk") || q.includes("attack") || q.includes("intruder")) {
      return `**Threat Assessment:**\n\n• Recent intruder attempts (7 days): ${recentIntruders}\n• Total intruder events: ${intruderEvents.length}\n• Behavior anomaly score: ${Math.round(behaviorAnomaly * 100)}%\n• Active security alerts: ${recommendations.filter((r) => !r.is_resolved).length}\n\n${recentIntruders > 0 ? "⚠️ Recent unauthorized access attempts detected. Review the Intruder Center for details." : "No recent threats detected. Your vault is secure."}`;
    }

    if (q.includes("vault") || q.includes("document") || q.includes("file") || q.includes("item")) {
      return `Your vault contains **${vaultItems.length}** items across various categories.\n\n• Documents: ${vaultItems.filter((v) => ["document", "certificate"].includes(v.category)).length}\n• Identity cards: ${vaultItems.filter((v) => ["passport", "pan_card", "aadhaar", "driving_license"].includes(v.category)).length}\n• Cards: ${vaultItems.filter((v) => v.category === "card").length}\n• Notes: ${vaultItems.filter((v) => v.category === "note").length}\n\nAll items are encrypted with AES-256 and stored securely.`;
    }

    if (q.includes("backup")) {
      return "**Backup Status:** No backup has been performed yet.\n\nI recommend creating an encrypted backup in Settings → Backup & Restore. Regular backups protect your data and improve your security score.";
    }

    if (q.includes("face") || q.includes("biometric")) {
      return "Face recognition is your primary authentication method. Your face embeddings are encrypted and stored securely. You can update your face model in Settings → Authentication if your appearance has changed significantly.";
    }

    if (q.includes("hello") || q.includes("hi") || q.includes("hey")) {
      return `Hello! I'm your AI Digital Guardian. I can help you with:\n\n• Security score analysis\n• Password health recommendations\n• Threat assessment\n• Vault management guidance\n• Security improvement tips\n\nWhat would you like to know?`;
    }

    return `I'm your AI security assistant. I can help with security scores, password health, threat analysis, and recommendations. Try asking:\n\n${SUGGESTIONS.map((s) => `• "${s}"`).join("\n")}`;
  };

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || !user) return;
    setInput("");
    setTyping(true);

    await logChatMessage({ user_id: user.id, role: "user", content: msg });

    setTimeout(async () => {
      const response = generateResponse(msg);
      await logChatMessage({ user_id: user.id, role: "assistant", content: response });
      setTyping(false);
    }, 800);
  };

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto flex flex-col h-full">
      <PageHeader title="AI Security Assistant" subtitle="Your intelligent cybersecurity advisor" />

      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
          {chatMessages.length === 0 && !typing && (
            <div className="text-center py-8">
              <div className="inline-flex w-16 h-16 rounded-2xl bg-accent-soft items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI Digital Guardian</h3>
              <p className="text-sm text-muted max-w-md mx-auto mb-6">Ask me about your security score, password health, threats, or recommendations to improve your digital security.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => handleSend(s)} className="text-left px-4 py-2.5 rounded-xl bg-base-surface border border-base-border text-sm text-muted-light hover:text-white hover:border-accent/30 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {typing && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-soft flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-accent" />
              </div>
              <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-accent animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-base-border p-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about your security..."
            className="flex-1 bg-base-surface border border-base-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-muted-faint focus:outline-none focus:border-accent"
          />
          <button onClick={() => handleSend()} disabled={!input.trim()} className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center text-white disabled:opacity-50 transition-all hover:shadow-glow">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </Card>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isUser ? "bg-base-elevated" : "bg-accent-soft"}`}>
        {isUser ? <User className="w-4 h-4 text-muted-light" /> : <Bot className="w-4 h-4 text-accent" />}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${isUser ? "bg-base-elevated rounded-tr-sm" : "glass rounded-tl-sm"}`}>
        <p className="text-sm text-white whitespace-pre-wrap">{message.content}</p>
      </div>
    </motion.div>
  );
}
