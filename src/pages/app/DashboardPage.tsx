import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, Lock, KeyRound, TriangleAlert as AlertTriangle, Activity, Clock,
  FileText, Brain, ArrowRight, CircleCheck as CheckCircle2, Lightbulb, Zap,
  TrendingUp, Eye, Camera, Sparkles, ChevronRight, BarChart3, Settings,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis,
} from "recharts";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import { computeSecurityScore, generateInsights, riskColor, riskLabel } from "@/lib/securityEngine";
import { detectDuplicates } from "@/lib/vaultService";
import { Card, ProgressRing, Badge } from "@/components/ui";
import { formatDistanceToNow, format, subDays, eachDayOfInterval, isSameDay } from "date-fns";

const TOOLTIP_STYLE = {
  background: "rgba(8,11,20,0.98)",
  border: "1px solid rgba(0,229,255,0.2)",
  borderRadius: 12,
  color: "#fff",
  fontSize: 11,
};

const iconMap: Record<string, typeof Shield> = {
  Shield, Lock, KeyRound, AlertTriangle, Activity, FileText, Brain,
  CheckCircle2, Lightbulb, ShieldCheck: Shield,
};

/* ── Animated counter ── */
function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setVal(Math.round(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <>{val}</>;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { profile, user } = useAuthStore();
  const {
    vaultItems, passwordEntries, intruderEvents, securityEvents,
    recommendations, behaviorSamples,
  } = useDataStore();

  const hourOfDay = new Date().getHours();
  const greeting = hourOfDay < 5 ? "Good Night" : hourOfDay < 12 ? "Good Morning" : hourOfDay < 18 ? "Good Afternoon" : "Good Evening";
  const firstName = profile?.display_name?.split(" ")[0] ?? "User";

  const { scoreData, insights, weakCount, duplicateCount, expiringCount } = useMemo(() => {
    const weak = passwordEntries.filter((p) => p.is_weak);
    const dups = detectDuplicates(passwordEntries);
    const dupCount = passwordEntries.filter((p) => dups.has(p.id)).length;
    const expiring = vaultItems.filter((v) => {
      if (!v.expires_at) return false;
      const days = (new Date(v.expires_at).getTime() - Date.now()) / 86400000;
      return days <= 30 && days >= 0;
    });
    const recentIntruders = intruderEvents.filter((i) =>
      (Date.now() - new Date(i.created_at).getTime()) / 86400000 <= 7
    ).length;
    const behaviorAnomaly = behaviorSamples.length > 5
      ? behaviorSamples.filter((s) => s.anomaly_label === "anomaly").length / behaviorSamples.length
      : 0;
    const sd = computeSecurityScore({
      faceMatched: true, faceConfidence: 0.95, isTrustedLocation: true, isTrustedDevice: true,
      failedAttempts: 0, hasWeakPasswords: weak.length > 0, hasDuplicatePasswords: dupCount > 0,
      recentIntruders, backupCompletedDays: null, behaviorAnomaly, hourOfDay,
    });
    const ins = generateInsights({
      vaultItemCount: vaultItems.length, passwordCount: passwordEntries.length,
      weakPasswords: weak.length, duplicatePasswords: dupCount,
      recentIntruders, securityScore: sd.score, backupDays: null, expiringItems: expiring.length,
    });
    return { scoreData: sd, insights: ins, weakCount: weak.length, duplicateCount: dupCount, expiringCount: expiring.length };
  }, [vaultItems, passwordEntries, intruderEvents, behaviorSamples, hourOfDay]);

  // 7-day activity sparkline
  const activityData = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 6);
    return eachDayOfInterval({ start, end }).map((d) => ({
      date: format(d, "EEE"),
      events: securityEvents.filter((e) => isSameDay(new Date(e.created_at), d)).length,
      threats: securityEvents.filter((e) => isSameDay(new Date(e.created_at), d) && ["high", "critical"].includes(e.severity)).length,
    }));
  }, [securityEvents]);

  const scoreColorVal = riskColor(scoreData.level);
  const recentEvents = securityEvents.slice(0, 5);
  const activeRecs = recommendations.filter((r) => !r.is_resolved).slice(0, 4);

  const categoryGroups = {
    documents: vaultItems.filter((v) => ["document", "certificate"].includes(v.category)).length,
    identity: vaultItems.filter((v) => ["passport", "pan_card", "aadhaar", "driving_license"].includes(v.category)).length,
    financial: vaultItems.filter((v) => v.category === "card").length,
    personal: vaultItems.filter((v) => ["medical", "note", "image", "video"].includes(v.category)).length,
  };

  /* ── Quick actions ── */
  const quickActions = [
    { label: "Add Password", icon: KeyRound, color: "#8B5CF6", to: "/app/passwords" },
    { label: "Add to Vault", icon: Lock, color: "#3B82F6", to: "/app/vault" },
    { label: "Security Center", icon: Brain, color: "#F59E0B", to: "/app/security" },
    { label: "View Reports", icon: FileText, color: "#22C55E", to: "/app/reports" },
    { label: "Analytics", icon: BarChart3, color: "#00E5FF", to: "/app/analytics" },
    { label: "Settings", icon: Settings, color: "#64748B", to: "/app/settings" },
  ];

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-muted-light">AI Guardian Active</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            {greeting}, <span className="gradient-text">{firstName}</span> 👋
          </h1>
          <p className="text-sm text-muted mt-1">Your AI Digital Guardian is actively monitoring your security</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-muted">
          <Clock className="w-3.5 h-3.5" />
          {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
        </div>
      </motion.div>

      {/* ── Top row: Score + Vault + Passwords ── */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Security Score */}
        <motion.div variants={item}>
          <Card glow className="relative overflow-hidden h-full flex flex-col items-center justify-center py-8">
            {/* Animated bg glow */}
            <div
              className="absolute inset-0 opacity-10"
              style={{ background: `radial-gradient(circle at 50% 50%, ${scoreColorVal}, transparent 70%)` }}
            />
            <p className="text-xs text-muted uppercase tracking-widest mb-4">AI Security Score</p>
            <div className="relative">
              {/* Outer rotating ring */}
              <div
                className="absolute inset-[-8px] rounded-full border-2 border-dashed opacity-20 animate-rotate-ring"
                style={{ borderColor: scoreColorVal }}
              />
              <ProgressRing
                value={scoreData.score}
                size={150}
                stroke={10}
                color={scoreColorVal}
                label={`${scoreData.score}`}
                sublabel="/ 100"
              />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge color={scoreColorVal}>{riskLabel(scoreData.level)}</Badge>
            </div>
            <p className="text-xs text-muted mt-2 text-center">{scoreData.factors.length} factors analyzed</p>
            <button
              onClick={() => navigate("/app/security")}
              className="mt-4 flex items-center gap-1.5 text-xs font-medium transition-colors hover:gap-2.5"
              style={{ color: scoreColorVal }}
            >
              View details <ArrowRight className="w-3 h-3" />
            </button>
          </Card>
        </motion.div>

        {/* Vault Summary */}
        <motion.div variants={item}>
          <Card className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-accent" /> Vault Summary
              </h3>
              <button onClick={() => navigate("/app/vault")} className="text-xs text-accent hover:underline flex items-center gap-1">
                Open <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Documents", value: categoryGroups.documents, color: "#00E5FF", icon: FileText },
                { label: "Identity", value: categoryGroups.identity, color: "#3B82F6", icon: Shield },
                { label: "Cards", value: categoryGroups.financial, color: "#EC4899", icon: Lock },
                { label: "Personal", value: categoryGroups.personal, color: "#22C55E", icon: Activity },
              ].map((stat) => (
                <div key={stat.label} className="bg-base-surface rounded-xl p-3 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${stat.color}1A` }}>
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                  <div>
                    <p className="text-xs text-muted">{stat.label}</p>
                    <p className="text-lg font-bold text-white"><AnimatedCounter target={stat.value} /></p>
                  </div>
                </div>
              ))}
            </div>
            {expiringCount > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-warning/10 border border-warning/20">
                <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                <p className="text-xs text-warning">{expiringCount} document(s) expiring within 30 days</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Password Health */}
        <motion.div variants={item}>
          <Card className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-accent" /> Password Health
              </h3>
              <button onClick={() => navigate("/app/passwords")} className="text-xs text-accent hover:underline flex items-center gap-1">
                Review <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              {[
                { label: "Total Passwords", value: passwordEntries.length, color: "#00E5FF" },
                { label: "Weak Passwords", value: weakCount, color: weakCount > 0 ? "#EF4444" : "#22C55E" },
                { label: "Duplicates", value: duplicateCount, color: duplicateCount > 0 ? "#F59E0B" : "#22C55E" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between p-2.5 bg-base-surface rounded-lg">
                  <span className="text-sm text-muted-light">{stat.label}</span>
                  <span className="text-lg font-bold" style={{ color: stat.color }}>
                    <AnimatedCounter target={stat.value} />
                  </span>
                </div>
              ))}
            </div>
            {/* Mini strength bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted">Avg Strength</span>
                <span className="text-xs font-mono text-accent">
                  {passwordEntries.length > 0
                    ? Math.round(passwordEntries.reduce((a, p) => a + p.strength_score, 0) / passwordEntries.length)
                    : 0}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-base-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${passwordEntries.length > 0 ? Math.round(passwordEntries.reduce((a, p) => a + p.strength_score, 0) / passwordEntries.length) : 0}%`,
                    background: "linear-gradient(90deg, #EF4444, #F59E0B, #22C55E)",
                  }}
                />
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* ── Activity sparkline + Intruder alert ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" /> 7-Day Activity
              </h3>
              <button onClick={() => navigate("/app/analytics")} className="text-xs text-accent hover:underline flex items-center gap-1">
                Full analytics <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 2, right: 2, bottom: 0, left: -30 }}>
                  <defs>
                    <linearGradient id="evGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#00E5FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="events" name="Events" stroke="#00E5FF" strokeWidth={2} fill="url(#evGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-muted">{securityEvents.length} total events logged</span>
              <span className="text-xs text-muted">•</span>
              <span className="text-xs text-muted">{intruderEvents.length} intruder attempts</span>
            </div>
          </Card>
        </motion.div>

        {/* Threat summary */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-accent" /> Threat Status
              </h3>
              <button onClick={() => navigate("/app/intruders")} className="text-xs text-accent hover:underline flex items-center gap-1">
                Intruder Center <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Recent Intruder Events", value: intruderEvents.filter((i) => (Date.now() - new Date(i.created_at).getTime()) / 86400000 <= 7).length, threshold: 0, icon: Camera, unit: "this week" },
                { label: "Active Recommendations", value: recommendations.filter((r) => !r.is_resolved).length, threshold: 0, icon: Lightbulb, unit: "pending" },
                { label: "Behavior Anomalies", value: behaviorSamples.filter((s) => s.anomaly_label === "anomaly").length, threshold: 0, icon: Activity, unit: "detected" },
              ].map((stat) => {
                const bad = stat.value > stat.threshold;
                return (
                  <div key={stat.label} className="flex items-center justify-between p-3 rounded-xl bg-base-surface">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: bad ? "#EF444422" : "#22C55E22" }}
                      >
                        <stat.icon className="w-4 h-4" style={{ color: bad ? "#EF4444" : "#22C55E" }} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-light">{stat.label}</p>
                        <p className="text-[10px] text-muted">{stat.unit}</p>
                      </div>
                    </div>
                    <span
                      className="text-xl font-bold"
                      style={{ color: bad ? "#EF4444" : "#22C55E" }}
                    >
                      <AnimatedCounter target={stat.value} />
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* ── AI Insights ── */}
      {insights.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-accent" /> AI Insights
            </h3>
            <span className="text-xs text-muted">{insights.length} recommendation{insights.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.slice(0, 6).map((insight, i) => {
              const Icon = insight.icon ? (iconMap[insight.icon] ?? Lightbulb) : Lightbulb;
              const color = insight.type === "danger" ? "#EF4444" : insight.type === "warning" ? "#F59E0B" : insight.type === "success" ? "#22C55E" : "#00E5FF";
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Card className="h-full hover:border-accent/20 transition-all">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}1A` }}
                      >
                        <Icon className="w-4.5 h-4.5" style={{ color, width: 18, height: 18 }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white leading-snug">{insight.title}</p>
                        <p className="text-xs text-muted mt-1 leading-relaxed">{insight.message}</p>
                        {insight.action && (
                          <button className="text-xs mt-2 font-medium flex items-center gap-1" style={{ color }}>
                            {insight.action} <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Recent Activity + Recommendations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" /> Recent Activity
              </h3>
              <button onClick={() => navigate("/app/timeline")} className="text-xs text-accent hover:underline">View all</button>
            </div>
            {recentEvents.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-base-elevated flex items-center justify-center mb-3">
                  <Activity className="w-6 h-6 text-muted" />
                </div>
                <p className="text-sm text-muted">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentEvents.map((event, i) => {
                  const sev = event.severity;
                  const color = sev === "critical" ? "#EF4444" : sev === "high" ? "#F97316" : sev === "medium" ? "#F59E0B" : sev === "low" ? "#84CC16" : "#22C55E";
                  return (
                    <motion.div key={event.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-base-surface hover:bg-base-elevated transition-all">
                        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 animate-pulse" style={{ background: color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate font-medium">{event.title}</p>
                          <p className="text-xs text-muted">{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</p>
                        </div>
                        <Badge color={color}>{sev}</Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Recommendations */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" /> Recommendations
              </h3>
              <button onClick={() => navigate("/app/security")} className="text-xs text-accent hover:underline">View all</button>
            </div>
            {activeRecs.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <p className="text-sm font-medium text-white">All clear!</p>
                <p className="text-xs text-muted mt-1">No active recommendations</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeRecs.map((rec, i) => {
                  const priColor = rec.priority === "critical" ? "#EF4444" : rec.priority === "high" ? "#F97316" : rec.priority === "medium" ? "#F59E0B" : "#22C55E";
                  return (
                    <motion.div key={rec.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-base-surface hover:bg-base-elevated transition-all">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${priColor}1A` }}
                        >
                          <Lightbulb className="w-4 h-4" style={{ color: priColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium">{rec.title}</p>
                          <p className="text-xs text-muted mt-0.5 line-clamp-2">{rec.description}</p>
                        </div>
                        <Badge color={priColor}>{rec.priority}</Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* ── Quick Actions ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" /> Quick Actions
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(action.to)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-base-surface border border-base-border hover:border-accent/20 transition-all"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${action.color}1A` }}
              >
                <action.icon className="w-5 h-5" style={{ color: action.color }} />
              </div>
              <span className="text-[10px] text-muted-light text-center font-medium leading-tight">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── Intruder threat banner ── */}
      {intruderEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={() => navigate("/app/intruders")}
          whileHover={{ scale: 1.01 }}
          className="cursor-pointer"
        >
          <div
            className="glass rounded-2xl p-4 flex items-center gap-4 border"
            style={{ borderColor: intruderEvents.length > 2 ? "#EF444440" : "#F59E0B40" }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse"
              style={{ background: intruderEvents.length > 2 ? "#EF444422" : "#F59E0B22" }}
            >
              <AlertTriangle style={{ width: 24, height: 24, color: intruderEvents.length > 2 ? "#EF4444" : "#F59E0B" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">
                {intruderEvents.length} Intruder Event{intruderEvents.length !== 1 ? "s" : ""} Detected
              </p>
              <p className="text-xs text-muted">Tap to review evidence in the Intruder Center</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted" />
          </div>
        </motion.div>
      )}
    </div>
  );
}
