import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Brain,
  Clock,
  Smartphone,
  MapPin,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Sparkles,
  Play,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { Card, SectionTitle, Badge, Button, StatCard, Spinner } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import {
  analyzeBehavior,
  labelForTier,
  colorForTier,
} from "@/lib/securityEngine";
import { logBehaviorSample, logThreatEvent, pushNotification } from "@/lib/securityService";
import { getGeoInfo } from "@/lib/device";
import { format } from "date-fns";
import type { AnomalyLabel } from "@/types";

const MODELS = [
  {
    name: "Isolation Forest",
    desc: "Detects anomalies by isolating outliers in random trees.",
    color: "#00E5FF",
  },
  {
    name: "One-Class SVM",
    desc: "Learns a boundary around normal behavior; flags deviations.",
    color: "#22C55E",
  },
  {
    name: "Autoencoder",
    desc: "Reconstructs normal patterns; high reconstruction error = anomaly.",
    color: "#F59E0B",
  },
];

export default function BehaviorPage() {
  const { user } = useAuthStore();
  const { behaviorSamples, trustedLocations, loaded, loadAll } = useDataStore();
  const [scanning, setScanning] = useState(false);
  const [latest, setLatest] = useState<ReturnType<typeof analyzeBehavior> | null>(null);

  const chartData = useMemo(
    () =>
      behaviorSamples
        .slice(0, 30)
        .reverse()
        .map((b, i) => ({
          i: i + 1,
          confidence: Math.round(b.confidence * 100),
          label: b.anomaly_label,
        })),
    [behaviorSamples]
  );

  const labelCounts = useMemo(() => {
    const counts: Record<string, number> = {
      normal: 0,
      suspicious: 0,
      high_risk: 0,
      critical: 0,
    };
    behaviorSamples.forEach((b) => {
      counts[b.anomaly_label] = (counts[b.anomaly_label] ?? 0) + 1;
    });
    return [
      { label: "Normal", count: counts.normal, color: "#22C55E" },
      { label: "Suspicious", count: counts.suspicious, color: "#F59E0B" },
      { label: "High Risk", count: counts.high_risk, color: "#FB7185" },
      { label: "Critical", count: counts.critical, color: "#EF4444" },
    ];
  }, [behaviorSamples]);

  async function runScan() {
    if (!user) return;
    setScanning(true);
    const geo = await getGeoInfo();
    const hour = new Date().getHours();
    const isKnown = geo
      ? trustedLocations.some(
          (l) =>
            Math.abs(l.latitude - geo.latitude) < 0.05 &&
            Math.abs(l.longitude - geo.longitude) < 0.05
        )
      : false;
    const res = analyzeBehavior({
      unlockHour: hour,
      screenOnDurationMin: 90 + Math.floor(Math.random() * 240),
      motion: Math.random() * 0.8,
      repeatedFailures: Math.floor(Math.random() * 5),
      isKnownLocation: isKnown,
    });
    setLatest(res);
    const labelMap: Record<string, AnomalyLabel> = {
      normal: "normal",
      suspicious: "suspicious",
      high_risk: "high_risk",
      critical: "critical",
    };
    await logBehaviorSample({
      user_id: user.id,
      unlock_time: `${String(hour).padStart(2, "0")}:00`,
      usage_pattern: "interactive",
      repeated_failures: 0,
      anomaly_label: labelMap[res.label],
      confidence: res.confidence,
      explanation: res.explanation,
    });
    if (res.label !== "normal") {
      await logThreatEvent({
        user_id: user.id,
        event_type: "behavior_anomaly",
        title: `Behavior anomaly: ${res.label.replace("_", " ")}`,
        description: res.explanation,
        severity: res.label === "critical" ? "critical" : res.label === "high_risk" ? "high" : "medium",
        metadata: { confidence: res.confidence },
      });
      await pushNotification({
        user_id: user.id,
        title: "Behavior Anomaly Detected",
        message: res.explanation.slice(0, 100),
        type: res.label === "critical" ? "danger" : "warning",
      });
    }
    await loadAll(user.id);
    setScanning(false);
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Behavioral AI</h1>
        <p className="mt-1 text-sm text-muted">
          Three ML models analyze your usage patterns to detect anomalies in
          real time — with explainable confidence.
        </p>
      </div>

      {/* Model cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {MODELS.map((m) => (
          <Card key={m.name} className="relative overflow-hidden">
            <div
              className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-20 blur-2xl"
              style={{ background: m.color }}
            />
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: `${m.color}1a`, color: m.color }}
            >
              <Brain size={20} />
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{m.name}</p>
            <p className="mt-1 text-xs text-muted">{m.desc}</p>
          </Card>
        ))}
      </div>

      {/* Live scan */}
      <Card>
        <SectionTitle
          title="Live Behavior Scan"
          subtitle="Run an on-demand anomaly analysis"
          action={<Badge color="accent"><Cpu size={12} /> AI Engine</Badge>}
        />
        <div className="flex flex-col items-center gap-4 py-4">
          <motion.div
            animate={scanning ? { rotate: 360 } : {}}
            transition={{ duration: 2, repeat: scanning ? Infinity : 0, ease: "linear" }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent"
          >
            <Activity size={28} />
          </motion.div>
          <Button onClick={runScan} disabled={scanning}>
            <Play size={16} />
            {scanning ? "Analyzing behavior…" : "Run Behavior Analysis"}
          </Button>
        </div>

        {latest && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-xl border p-4"
            style={{
              borderColor: `${colorForTier(latest.label === "normal" ? "low" : (latest.label as any))}40`,
              background: `${colorForTier(latest.label === "normal" ? "low" : (latest.label as any))}10`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {latest.label === "normal" ? (
                  <CheckCircle2 size={18} className="text-success" />
                ) : (
                  <AlertTriangle size={18} className="text-warning" />
                )}
                <p className="text-sm font-semibold capitalize text-white">
                  {latest.label.replace("_", " ")}
                </p>
              </div>
              <span className="font-mono text-sm font-bold" style={{ color: colorForTier(latest.label === "normal" ? "low" : (latest.label as any)) }}>
                {(latest.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <p className="mt-2 text-xs text-muted">{latest.explanation}</p>
            {latest.factors.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {latest.factors.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-light">
                    <Sparkles size={12} className="mt-0.5 shrink-0 text-accent" />
                    {f}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Samples" value={behaviorSamples.length} icon={<Activity size={18} />} />
        <StatCard label="Normal" value={labelCounts[0].count} icon={<CheckCircle2 size={18} />} accent="#22C55E" />
        <StatCard label="Anomalies" value={labelCounts.slice(1).reduce((a, b) => a + b.count, 0)} icon={<AlertTriangle size={18} />} accent="#F59E0B" />
        <StatCard label="Avg Confidence" value={`${Math.round((behaviorSamples.reduce((a, b) => a + b.confidence, 0) / (behaviorSamples.length || 1)) * 100)}%`} icon={<Brain size={18} />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Anomaly Confidence" subtitle="Recent samples" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="anomG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#22304A" />
                <XAxis dataKey="i" stroke="#5A6B86" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#5A6B86" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#171F2F",
                    border: "1px solid #22304A",
                    borderRadius: 12,
                    color: "#fff",
                  }}
                />
                <Area type="monotone" dataKey="confidence" stroke="#F59E0B" strokeWidth={2} fill="url(#anomG)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Label Distribution" subtitle="All samples" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={labelCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#22304A" />
                <XAxis dataKey="label" stroke="#5A6B86" fontSize={11} tickLine={false} />
                <YAxis allowDecimals={false} stroke="#5A6B86" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#171F2F",
                    border: "1px solid #22304A",
                    borderRadius: 12,
                    color: "#fff",
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {labelCounts.map((entry, i) => (
                    <Bar key={i} dataKey="count" fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent samples */}
      <Card>
        <SectionTitle title="Recent Behavior Samples" />
        <div className="space-y-2">
          {behaviorSamples.slice(0, 8).map((b) => {
            const color = colorForTier(b.anomaly_label === "normal" ? "low" : (b.anomaly_label as any));
            return (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-xl border border-base-border bg-base-surface/40 p-3"
              >
                <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium capitalize text-white">
                    {b.anomaly_label.replace("_", " ")}
                  </p>
                  <p className="truncate text-xs text-muted">{b.explanation}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-medium" style={{ color }}>
                    {(b.confidence * 100).toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-muted-faint">
                    {format(new Date(b.created_at), "MMM d, HH:mm")}
                  </p>
                </div>
              </div>
            );
          })}
          {behaviorSamples.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">
              No behavior samples yet. Run a scan above to begin.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
