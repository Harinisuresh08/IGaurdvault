import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  TrendingUp, Activity, Camera, Shield, BarChart3, KeyRound, Lock, Brain,
} from "lucide-react";
import { useDataStore } from "@/stores/dataStore";
import { Card, ProgressRing, Badge } from "@/components/ui";
import { PageHeader } from "@/components/layout/PageHeader";
import { computeSecurityScore } from "@/lib/securityEngine";
import { detectDuplicates } from "@/lib/vaultService";
import { format, subDays, eachDayOfInterval, isSameDay } from "date-fns";

type Range = "7d" | "14d" | "30d";

const TOOLTIP_STYLE = {
  background: "rgba(8, 11, 20, 0.98)",
  border: "1px solid rgba(0, 229, 255, 0.2)",
  borderRadius: 12,
  color: "#fff",
  backdropFilter: "blur(12px)",
};

export default function AnalyticsPage() {
  const {
    securityEvents, intruderEvents, passwordEntries, vaultItems, behaviorSamples,
  } = useDataStore();
  const [range, setRange] = useState<Range>("7d");

  const days = range === "7d" ? 7 : range === "14d" ? 14 : 30;

  const weak = passwordEntries.filter((p) => p.is_weak);
  const dups = detectDuplicates(passwordEntries);
  const dupCount = passwordEntries.filter((p) => dups.has(p.id)).length;
  const recentIntruders = intruderEvents.filter((i) =>
    (Date.now() - new Date(i.created_at).getTime()) / 86400000 <= 7
  ).length;
  const avgStrength = passwordEntries.length > 0
    ? Math.round(passwordEntries.reduce((a, p) => a + p.strength_score, 0) / passwordEntries.length)
    : 0;

  const securityScore = computeSecurityScore({
    faceMatched: true, faceConfidence: 0.95, isTrustedLocation: true, isTrustedDevice: true,
    failedAttempts: 0, hasWeakPasswords: weak.length > 0, hasDuplicatePasswords: dupCount > 0,
    recentIntruders, backupCompletedDays: null, behaviorAnomaly: 0, hourOfDay: new Date().getHours(),
  });

  // Activity over time
  const activitySeries = useMemo(() => {
    const end = new Date();
    const start = subDays(end, days);
    return eachDayOfInterval({ start, end }).map((d) => {
      const dayEvents = securityEvents.filter((e) => isSameDay(new Date(e.created_at), d));
      const dayIntruders = intruderEvents.filter((e) => isSameDay(new Date(e.created_at), d));
      return {
        date: format(d, days <= 7 ? "EEE" : "MMM d"),
        events: dayEvents.length,
        intruders: dayIntruders.length,
        safe: dayEvents.filter((e) => e.severity === "info").length,
        threats: dayEvents.filter((e) => ["high", "critical"].includes(e.severity)).length,
      };
    });
  }, [securityEvents, intruderEvents, days]);

  // Behavior anomaly trend
  const behaviorSeries = useMemo(() => {
    return behaviorSamples.slice(0, 20).reverse().map((b, i) => ({
      i: i + 1,
      confidence: Math.round(b.confidence * 100),
      anomaly: b.anomaly_label === "anomaly" ? 100 : 0,
    }));
  }, [behaviorSamples]);

  // Vault categories
  const categoryData = useMemo(() => [
    { name: "Documents", value: vaultItems.filter((v) => ["document", "certificate"].includes(v.category)).length, color: "#00E5FF" },
    { name: "Identity", value: vaultItems.filter((v) => ["passport", "pan_card", "aadhaar", "driving_license"].includes(v.category)).length, color: "#3B82F6" },
    { name: "Cards", value: vaultItems.filter((v) => v.category === "card").length, color: "#EC4899" },
    { name: "Medical", value: vaultItems.filter((v) => v.category === "medical").length, color: "#22C55E" },
    { name: "Notes", value: vaultItems.filter((v) => v.category === "note").length, color: "#F59E0B" },
    { name: "Other", value: vaultItems.filter((v) => ["image", "video", "recovery_code", "license_key"].includes(v.category)).length, color: "#8B5CF6" },
  ].filter((d) => d.value > 0), [vaultItems]);

  // Password health breakdown
  const pwdHealthData = [
    { name: "Strong", value: passwordEntries.filter((p) => p.strength_score >= 70).length, color: "#22C55E" },
    { name: "Fair", value: passwordEntries.filter((p) => p.strength_score >= 40 && p.strength_score < 70).length, color: "#F59E0B" },
    { name: "Weak", value: passwordEntries.filter((p) => p.strength_score < 40).length, color: "#EF4444" },
  ].filter((d) => d.value > 0);

  const scoreColor = securityScore.score >= 80 ? "#22C55E" : securityScore.score >= 60 ? "#F59E0B" : "#EF4444";

  const stats = [
    { label: "Security Score", value: securityScore.score, icon: <Shield className="w-5 h-5" />, color: scoreColor, suffix: "/100" },
    { label: "Vault Items", value: vaultItems.length, icon: <Lock className="w-5 h-5" />, color: "#3B82F6", suffix: " items" },
    { label: "Passwords", value: passwordEntries.length, icon: <KeyRound className="w-5 h-5" />, color: "#8B5CF6", suffix: " total" },
    { label: "Total Events", value: securityEvents.length, icon: <Activity className="w-5 h-5" />, color: "#00E5FF", suffix: " logged" },
    { label: "Intruder Attempts", value: intruderEvents.length, icon: <Camera className="w-5 h-5" />, color: "#EF4444", suffix: " detected" },
    { label: "Behavior Samples", value: behaviorSamples.length, icon: <Brain className="w-5 h-5" />, color: "#F59E0B", suffix: " analyzed" },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Security Analytics"
        subtitle="Comprehensive security intelligence and trend analysis"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="text-center relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-5"
                style={{ background: `radial-gradient(circle at center, ${stat.color}, transparent)` }}
              />
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                style={{ background: `${stat.color}1A` }}
              >
                <div style={{ color: stat.color }}>{stat.icon}</div>
              </div>
              <p className="text-xs text-muted mb-1 truncate">{stat.label}</p>
              <p className="text-xl font-bold text-white">{stat.value}<span className="text-xs text-muted font-normal">{stat.suffix}</span></p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Range selector */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-accent" /> Security Timeline
        </h3>
        <div className="flex gap-1">
          {(["7d", "14d", "30d"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${range === r
                ? "gradient-accent text-white shadow-glow"
                : "bg-base-elevated text-muted hover:text-white border border-base-border"
                }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Activity chart */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">Security Events Over Time</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activitySeries} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="eventsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#00E5FF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="threatsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="events" name="Total Events" stroke="#00E5FF" strokeWidth={2} fill="url(#eventsGrad)" />
                <Area type="monotone" dataKey="threats" name="Threats" stroke="#EF4444" strokeWidth={2} fill="url(#threatsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-accent" /><span className="text-xs text-muted">Total Events</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-danger" /><span className="text-xs text-muted">Threats</span></div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Security Score Ring */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="h-full flex flex-col items-center justify-center text-center" glow>
            <p className="text-xs text-muted uppercase tracking-wider mb-3">Overall Score</p>
            <ProgressRing value={securityScore.score} size={140} stroke={10} color={scoreColor} label={`${securityScore.score}`} sublabel="/ 100" />
            <div className="mt-3">
              <Badge color={scoreColor}>{securityScore.level} Risk</Badge>
            </div>
            <p className="text-xs text-muted mt-2">{securityScore.factors.length} factors analyzed</p>
          </Card>
        </motion.div>

        {/* Vault categories pie */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="h-full">
            <h3 className="text-sm font-semibold text-white mb-3">Vault Distribution</h3>
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted text-sm">No vault items yet</div>
            ) : (
              <>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={3}>
                        {categoryData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {categoryData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-[10px] text-muted">{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </motion.div>

        {/* Password health */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="h-full">
            <h3 className="text-sm font-semibold text-white mb-3">Password Health</h3>
            {pwdHealthData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted text-sm">No passwords yet</div>
            ) : (
              <>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pwdHealthData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={3}>
                        {pwdHealthData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {pwdHealthData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-[10px] text-muted">{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-base-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Average Strength</span>
                    <span className="text-sm font-bold" style={{ color: avgStrength >= 70 ? "#22C55E" : avgStrength >= 40 ? "#F59E0B" : "#EF4444" }}>{avgStrength}%</span>
                  </div>
                </div>
              </>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Daily intruder & behavior charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Intruder Attempts</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activitySeries} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="intruders" name="Intruders" fill="#EF4444" radius={[4, 4, 0, 0]} opacity={0.9} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted mt-2">
              {intruderEvents.length === 0 ? "No intruder attempts detected" : `${intruderEvents.length} total attempts recorded`}
            </p>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Behavior Confidence Trend</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={behaviorSeries} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="i" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="confidence" name="Confidence %" stroke="#F59E0B" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted mt-2">
              {behaviorSamples.length === 0 ? "No behavior data yet — will populate as you use the app" : `Based on ${behaviorSamples.length} behavior samples`}
            </p>
          </Card>
        </motion.div>
      </div>

      {/* Security factor breakdown bars */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" /> Security Factor Breakdown
          </h3>
          <div className="space-y-3">
            {securityScore.factors.map((factor, i) => {
              const color = factor.status === "good" ? "#22C55E" : factor.status === "warning" ? "#F59E0B" : "#EF4444";
              const pct = factor.status === "good" ? 100 : factor.status === "warning" ? 50 : 10;
              return (
                <motion.div key={factor.key} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-light">{factor.label}</span>
                    <span className="text-xs text-muted">{factor.detail.slice(0, 40)}{factor.detail.length > 40 ? "…" : ""}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-base-border overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.06 }}
                      style={{ background: `linear-gradient(90deg, ${color}88, ${color})`, boxShadow: `0 0 8px ${color}66` }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
