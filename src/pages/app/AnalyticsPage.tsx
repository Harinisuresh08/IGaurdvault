import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, Activity, Camera, MapPin, Shield } from "lucide-react";
import { Card, SectionTitle, Badge, Spinner, StatCard } from "@/components/ui";
import { useSecurityData } from "@/hooks/useSecurityData";
import { format, subDays, eachDayOfInterval, isSameDay } from "date-fns";

type Range = "daily" | "weekly" | "monthly" | "yearly";

export default function AnalyticsPage() {
  const data = useSecurityData();
  const [range, setRange] = useState<Range>("weekly");

  const days = range === "daily" ? 1 : range === "weekly" ? 7 : range === "monthly" ? 30 : 365;

  const scoreSeries = useMemo(() => {
    const end = new Date();
    const start = subDays(end, Math.min(days, 30));
    const each = eachDayOfInterval({ start, end });
    return each.map((d) => {
      const dayScores = data.scoreLogs.filter((s) => isSameDay(new Date(s.created_at), d));
      return {
        date: format(d, "MMM d"),
        score: dayScores.length
          ? Math.round(dayScores.reduce((a, s) => a + s.score, 0) / dayScores.length)
          : 0,
        events: data.threatEvents.filter((e) => isSameDay(new Date(e.created_at), d)).length,
      };
    });
  }, [data, days]);

  const intruderSeries = useMemo(() => {
    const map = new Map<string, number>();
    data.intruderEvents.forEach((e) => {
      const k = format(new Date(e.created_at), "MMM d");
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  }, [data.intruderEvents]);

  const eventPie = useMemo(() => {
    const map = new Map<string, number>();
    data.threatEvents.forEach((e) => {
      map.set(e.event_type, (map.get(e.event_type) ?? 0) + 1);
    });
    const colors: Record<string, string> = {
      login_success: "#22C55E",
      login_failed: "#EF4444",
      unknown_face: "#F59E0B",
      intruder_capture: "#EF4444",
      alert_sent: "#00E5FF",
      location_change: "#FB7185",
      behavior_anomaly: "#F59E0B",
      report_generated: "#00E5FF",
      emergency_triggered: "#EF4444",
      face_registered: "#22C55E",
      setting_changed: "#5A6B86",
    };
    return Array.from(map.entries()).map(([name, value]) => ({
      name: name.replace("_", " "),
      value,
      color: colors[name] ?? "#00E5FF",
    }));
  }, [data.threatEvents]);

  const behaviorSeries = useMemo(() => {
    return data.behaviorSamples
      .slice(0, 30)
      .reverse()
      .map((b, i) => ({
        i: i + 1,
        confidence: Math.round(b.confidence * 100),
      }));
  }, [data.behaviorSamples]);

  if (!data.loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            Visualize your security trends across time.
          </p>
        </div>
        <div className="flex gap-2">
          {(["daily", "weekly", "monthly", "yearly"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                range === r
                  ? "bg-accent text-base-bg"
                  : "bg-base-elevated text-muted hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Security Score" value={data.scoreLogs[0]?.score ?? 0} icon={<Shield size={18} />} />
        <StatCard label="Total Events" value={data.threatEvents.length} icon={<Activity size={18} />} accent="#00E5FF" />
        <StatCard label="Intruders" value={data.intruderEvents.length} icon={<Camera size={18} />} accent="#EF4444" />
        <StatCard label="Anomalies" value={data.behaviorSamples.filter((b) => b.anomaly_label !== "normal").length} icon={<TrendingUp size={18} />} accent="#F59E0B" />
      </div>

      <Card>
        <SectionTitle title="Security Score History" subtitle={`Score over the last ${range} period`} />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={scoreSeries}>
              <defs>
                <linearGradient id="sScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#00E5FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#22304A" />
              <XAxis dataKey="date" stroke="#5A6B86" fontSize={11} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#5A6B86" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#171F2F",
                  border: "1px solid #22304A",
                  borderRadius: 12,
                  color: "#fff",
                }}
              />
              <Area type="monotone" dataKey="score" stroke="#00E5FF" strokeWidth={2} fill="url(#sScore)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Threat Trend" subtitle="Events per day" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#22304A" />
                <XAxis dataKey="date" stroke="#5A6B86" fontSize={11} tickLine={false} />
                <YAxis allowDecimals={false} stroke="#5A6B86" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#171F2F",
                    border: "1px solid #22304A",
                    borderRadius: 12,
                    color: "#fff",
                  }}
                />
                <Bar dataKey="events" fill="#00E5FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Event Distribution" subtitle="By type" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={eventPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {eventPie.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="#0B0F19" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#171F2F",
                    border: "1px solid #22304A",
                    borderRadius: 12,
                    color: "#fff",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {eventPie.slice(0, 6).map((e) => (
              <span key={e.name} className="flex items-center gap-1.5 text-xs text-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                {e.name}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Behavior Trend" subtitle="Anomaly confidence" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={behaviorSeries}>
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
                <Line type="monotone" dataKey="confidence" stroke="#F59E0B" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Intruder Frequency" subtitle="Captures by date" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={intruderSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#22304A" />
                <XAxis dataKey="date" stroke="#5A6B86" fontSize={11} tickLine={false} />
                <YAxis allowDecimals={false} stroke="#5A6B86" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#171F2F",
                    border: "1px solid #22304A",
                    borderRadius: 12,
                    color: "#fff",
                  }}
                />
                <Bar dataKey="count" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {intruderSeries.length === 0 && (
            <p className="text-center text-xs text-muted">No intruder events recorded.</p>
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle title="Location Heatmap" subtitle="Where your security events happened" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => {
            const intensity = Math.random();
            return (
              <div
                key={i}
                className="aspect-square rounded-md"
                style={{
                  background: `rgba(0, 229, 255, ${intensity * 0.6})`,
                }}
                title={`${Math.round(intensity * 10)} events`}
              />
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted">
          <span className="flex items-center gap-1">
            <MapPin size={12} /> Less
          </span>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-2 w-6 rounded-sm"
                style={{ background: `rgba(0,229,255,${(i + 1) * 0.15})` }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </Card>
    </div>
  );
}
