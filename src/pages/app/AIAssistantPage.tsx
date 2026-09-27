import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Send, Shield, KeyRound, Lock, TriangleAlert as AlertTriangle,
  Brain, Zap, Lightbulb, User, Sparkles, ChevronRight, Copy, CheckCheck,
  TrendingUp, Activity,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import { logChatMessage } from "@/lib/securityService";
import { computeSecurityScore, generateInsights } from "@/lib/securityEngine";
import { detectDuplicates } from "@/lib/vaultService";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Badge } from "@/components/ui";
import type { ChatMessage } from "@/types";

const SUGGESTIONS = [
  { text: "What's my security score?", icon: Shield },
  { text: "Are my passwords safe?", icon: KeyRound },
  { text: "How can I improve security?", icon: TrendingUp },
  { text: "Any active threats?", icon: AlertTriangle },
  { text: "What's in my vault?", icon: Lock },
  { text: "Analyze my behavior patterns", icon: Activity },
];

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-muted-light">$1</em>')
    .replace(/^• /gm, '<span class="text-accent mr-1">•</span>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export default function AIAssistantPage() {
  const { user } = useAuthStore();
  const { chatMessages, passwordEntries, vaultItems, intruderEvents, behaviorSamples, recommendations } = useDataStore();
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const messagesEndRef = useMemo(() => ({ current: null as HTMLDivElement | null }), []);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const generateResponse = (query: string): string => {
    const q = query.toLowerCase();
    const weak = passwordEntries.filter((p) => p.is_weak);
    const dups = detectDuplicates(passwordEntries);
    const dupCount = passwordEntries.filter((p) => dups.has(p.id)).length;
    const recentIntruders = intruderEvents.filter((i) =>
      (Date.now() - new Date(i.created_at).getTime()) / 86400000 <= 7
    ).length;
    const behaviorAnomaly = behaviorSamples.length > 5
      ? behaviorSamples.filter((s) => s.anomaly_label === "anomaly").length / behaviorSamples.length : 0;

    const score = computeSecurityScore({
      faceMatched: true, faceConfidence: 0.95, isTrustedLocation: true, isTrustedDevice: true,
      failedAttempts: 0, hasWeakPasswords: weak.length > 0, hasDuplicatePasswords: dupCount > 0,
      recentIntruders, backupCompletedDays: null, behaviorAnomaly, hourOfDay: new Date().getHours(),
    });

    // Greetings
    if (q.match(/^(hi|hello|hey|good|morning|evening|afternoon)/)) {
      const hour = new Date().getHours();
      const timeGreet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
      return `${timeGreet}! 👋 I'm your **AI Digital Guardian**.\n\nI'm actively monitoring your security. Here's a quick snapshot:\n\n• Security Score: **${score.score}/100** (${score.level} risk)\n• Vault Items: **${vaultItems.length}**\n• Saved Passwords: **${passwordEntries.length}**\n• Active Recommendations: **${recommendations.filter((r) => !r.is_resolved).length}**\n\nWhat would you like to know?`;
    }

    // Security score
    if (q.includes("score") || q.includes("how secure") || q.includes("security level")) {
      const factorSummary = score.factors.slice(0, 5).map((f) => `• **${f.label}**: ${f.detail}`).join("\n");
      return `Your **AI Security Score is ${score.score}/100** — ${score.level.toUpperCase()} risk level.\n\n**Key Factors:**\n${factorSummary}\n\n${score.score >= 80 ? "✅ Excellent security posture! Keep it up." : score.score >= 60 ? "⚠️ Good, but some improvements recommended." : "🚨 Your security needs immediate attention. Check the Security Center."}`;
    }

    // Passwords
    if (q.includes("password")) {
      const avgStr = passwordEntries.length > 0
        ? Math.round(passwordEntries.reduce((a, p) => a + p.strength_score, 0) / passwordEntries.length) : 0;
      return `**Password Health Analysis:**\n\n• Total passwords: **${passwordEntries.length}**\n• Weak passwords: **${weak.length}** ${weak.length > 0 ? "🔴" : "✅"}\n• Duplicate passwords: **${dupCount}** ${dupCount > 0 ? "🟡" : "✅"}\n• Average strength: **${avgStr}%** ${avgStr >= 70 ? "✅" : avgStr >= 40 ? "⚠️" : "🔴"}\n\n${weak.length > 0 ? `**Action Required:** Update ${weak.length} weak password(s) immediately. Use the Password Manager's built-in generator to create strong, unique passwords.` : "All your passwords currently meet strength requirements. Great job!"}`;
    }

    // Threats / intruders
    if (q.includes("threat") || q.includes("danger") || q.includes("intruder") || q.includes("attack")) {
      return `**Threat Assessment Report:**\n\n• Recent intruder attempts (7 days): **${recentIntruders}** ${recentIntruders > 0 ? "🚨" : "✅"}\n• Total intruder events: **${intruderEvents.length}**\n• Behavior anomaly index: **${Math.round(behaviorAnomaly * 100)}%** ${behaviorAnomaly > 0.3 ? "⚠️" : "✅"}\n• Active alerts: **${recommendations.filter((r) => !r.is_resolved).length}**\n\n${recentIntruders > 0 ? "⚠️ **Alert:** Unauthorized access attempts detected recently. Check the Intruder Center for captured images, timestamps, and location data." : "✅ No recent threats detected. Your vault is secure."}`;
    }

    // Improve / recommend
    if (q.includes("improve") || q.includes("recommend") || q.includes("better") || q.includes("advice") || q.includes("tip")) {
      const insights = generateInsights({
        vaultItemCount: vaultItems.length, passwordCount: passwordEntries.length,
        weakPasswords: weak.length, duplicatePasswords: dupCount,
        recentIntruders, securityScore: score.score, backupDays: null, expiringItems: 0,
      });
      if (insights.length === 0) return "✅ **Your security posture is excellent!**\n\nKeep maintaining:\n• Strong, unique passwords\n• Regular vault backups\n• Monitoring your activity timeline\n• Reviewing AI recommendations";
      return `**Security Improvement Plan:**\n\n${insights.map((i, idx) => `**${idx + 1}. ${i.title}**\n${i.message}`).join("\n\n")}`;
    }

    // Vault
    if (q.includes("vault") || q.includes("document") || q.includes("file") || q.includes("item")) {
      return `**Your Secure Vault:**\n\n• Total items: **${vaultItems.length}**\n• Documents: **${vaultItems.filter((v) => ["document", "certificate"].includes(v.category)).length}**\n• Identity cards: **${vaultItems.filter((v) => ["passport", "pan_card", "aadhaar", "driving_license"].includes(v.category)).length}**\n• Credit/Debit cards: **${vaultItems.filter((v) => v.category === "card").length}**\n• Medical records: **${vaultItems.filter((v) => v.category === "medical").length}**\n• Secure notes: **${vaultItems.filter((v) => v.category === "note").length}**\n\nAll items are encrypted with **AES-256-GCM**. Keys are derived from your PIN and never stored in plaintext.`;
    }

    // Behavior
    if (q.includes("behavior") || q.includes("pattern") || q.includes("anomaly")) {
      return `**Behavior Analysis Report:**\n\n• Total behavior samples: **${behaviorSamples.length}**\n• Anomalies detected: **${behaviorSamples.filter((s) => s.anomaly_label === "anomaly").length}**\n• Anomaly rate: **${Math.round(behaviorAnomaly * 100)}%**\n\nThe AI continuously monitors your login patterns including time, location, device, and access behavior. ${behaviorAnomaly > 0.3 ? "⚠️ Some unusual patterns detected. Review your activity timeline." : "✅ Your behavior patterns look normal."}`;
    }

    // Backup
    if (q.includes("backup") || q.includes("restore")) {
      return "**Backup & Recovery:**\n\n• Last backup: **Not performed yet** ⚠️\n\nI strongly recommend creating an encrypted backup:\n\n**Steps:**\n1. Go to **Settings → Backup & Restore**\n2. Tap **Create Backup**\n3. Store the encrypted file safely\n\nRegular backups protect your data and improve your security score by up to **10 points**.";
    }

    // Face / biometric
    if (q.includes("face") || q.includes("biometric") || q.includes("recognition")) {
      return "**Face Recognition System:**\n\nYour face embeddings are:\n• Encrypted with AES-256 before storage\n• Never transmitted to servers\n• Processed entirely on-device\n\nIf your face isn't being recognized well, try:\n• Ensure good, even lighting\n• Face the camera directly\n• Update your face model in **Settings → Authentication → Update Face**";
    }

    return `I'm your **AI Security Guardian**. I can help with:\n\n• 🛡️ Security score analysis\n• 🔑 Password health & recommendations\n• 🚨 Threat assessment\n• 📁 Vault management guidance\n• 🧠 Behavior pattern analysis\n• 💡 Security improvement tips\n\nTry asking one of the suggestions below, or ask me anything about your digital security!`;
  };

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || !user) return;
    setInput("");
    setTyping(true);
    scrollToBottom();

    await logChatMessage({ user_id: user.id, role: "user", content: msg });

    await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));
    const response = generateResponse(msg);
    await logChatMessage({ user_id: user.id, role: "assistant", content: response });
    setTyping(false);
    scrollToBottom();
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto flex flex-col" style={{ height: "calc(100vh - 80px)" }}>
      <PageHeader
        title="AI Security Assistant"
        subtitle="Your intelligent cybersecurity advisor powered by AI"
      />

      <Card className="flex-1 flex flex-col overflow-hidden" noPad>
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
          {chatMessages.length === 0 && !typing && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-6"
            >
              {/* AI avatar */}
              <div className="relative inline-flex w-20 h-20 items-center justify-center mb-5">
                <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" style={{ animationDuration: "3s" }} />
                <div className="w-20 h-20 rounded-full gradient-accent flex items-center justify-center shadow-glow">
                  <Bot className="w-10 h-10 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">AI Digital Guardian</h3>
              <p className="text-sm text-muted max-w-sm mx-auto mb-6 leading-relaxed">
                Ask me about your security score, password health, vault contents, threats, or how to improve your digital security.
              </p>

              {/* Capability pills */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {[
                  { label: "Security Analysis", icon: Brain, color: "#00E5FF" },
                  { label: "Password Health", icon: KeyRound, color: "#8B5CF6" },
                  { label: "Threat Detection", icon: AlertTriangle, color: "#EF4444" },
                  { label: "AI Insights", icon: Sparkles, color: "#22C55E" },
                ].map((cap) => (
                  <div key={cap.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: `${cap.color}1A`, color: cap.color, border: `1px solid ${cap.color}30` }}>
                    <cap.icon className="w-3 h-3" />
                    {cap.label}
                  </div>
                ))}
              </div>

              {/* Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => handleSend(s.text)}
                    className="flex items-center gap-2.5 text-left px-4 py-3 rounded-xl bg-base-surface border border-base-border text-sm text-muted-light hover:text-white hover:border-accent/30 hover:bg-base-elevated transition-all group"
                  >
                    <s.icon className="w-4 h-4 flex-shrink-0 text-muted group-hover:text-accent transition-colors" />
                    <span>{s.text}</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 text-accent transition-all" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {chatMessages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                copied={copied}
                onCopy={handleCopy}
              />
            ))}
          </AnimatePresence>

          {typing && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center flex-shrink-0 shadow-glow">
                <Bot className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
              </div>
              <div className="glass rounded-2xl rounded-tl-sm px-5 py-3.5 flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-accent"
                    style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          <div ref={(el) => { messagesEndRef.current = el; }} />
        </div>

        {/* Input area */}
        <div className="border-t border-base-border p-4">
          {chatMessages.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar pb-1">
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s.text}
                  onClick={() => handleSend(s.text)}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-base-elevated border border-base-border text-muted hover:text-white hover:border-accent/30 transition-all"
                >
                  {s.text}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Ask about your security..."
                className="w-full bg-base-surface border border-base-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-muted-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all pr-12"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSend()}
              disabled={!input.trim() || typing}
              className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center text-white disabled:opacity-40 shadow-glow hover:shadow-glow-md transition-all flex-shrink-0"
            >
              <Send className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
            </motion.button>
          </div>
          <p className="text-[10px] text-muted-faint text-center mt-2">AI responses are generated based on your local security data</p>
        </div>
      </Card>
    </div>
  );
}

function MessageBubble({ message, copied, onCopy }: { message: ChatMessage; copied: string | null; onCopy: (t: string, id: string) => void }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", damping: 20 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isUser ? "bg-base-elevated" : "gradient-accent shadow-glow"}`}>
        {isUser ? <User className="w-4 h-4 text-muted-light" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      {/* Bubble */}
      <div className={`group relative max-w-[78%] ${isUser ? "" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${isUser
            ? "bg-base-elevated rounded-tr-sm"
            : "glass rounded-tl-sm border border-base-border/50"
            }`}
        >
          {isUser ? (
            <p className="text-sm text-white">{message.content}</p>
          ) : (
            <p
              className="text-sm text-white/90 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
            />
          )}
        </div>

        {/* Copy button */}
        {!isUser && (
          <button
            onClick={() => onCopy(message.content, message.id)}
            className="absolute -bottom-6 right-0 flex items-center gap-1 text-[10px] text-muted hover:text-white transition-colors opacity-0 group-hover:opacity-100"
          >
            {copied === message.id ? <CheckCheck className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            {copied === message.id ? "Copied!" : "Copy"}
          </button>
        )}
      </div>
    </motion.div>
  );
}
