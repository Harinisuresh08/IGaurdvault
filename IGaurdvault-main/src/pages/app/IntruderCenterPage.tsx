import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Camera, MapPin, Smartphone, Clock, AlertTriangle, Shield,
  Eye, Download, Filter, SortDesc, ChevronDown, X, BarChart3,
} from "lucide-react";
import { useDataStore } from "@/stores/dataStore";
import { useAuthStore } from "@/stores/authStore";
import { Card, Badge, Button, EmptyState, Modal } from "@/components/ui";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatDistanceToNow, format } from "date-fns";
import { generateIntruderReport } from "@/lib/reportGenerator";
import type { IntruderEvent } from "@/types";

const RISK_LEVELS = ["all", "critical", "high", "medium", "low"] as const;
type RiskFilter = typeof RISK_LEVELS[number];

function getRiskColor(score?: number | null): string {
  if (!score) return "#64748B";
  if (score >= 80) return "#EF4444";
  if (score >= 60) return "#F97316";
  if (score >= 40) return "#F59E0B";
  return "#22C55E";
}

function getRiskLabel(score?: number | null): string {
  if (!score) return "Unknown";
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

export default function IntruderCenterPage() {
  const { intruderEvents } = useDataStore();
  const [selected, setSelected] = useState<IntruderEvent | null>(null);
  const [filter, setFilter] = useState<RiskFilter>("all");
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    let result = [...intruderEvents];
    if (filter !== "all") {
      result = result.filter((e) => {
        const label = getRiskLabel(e.risk_score).toLowerCase();
        return label === filter;
      });
    }
    result.sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return sortDesc ? diff : -diff;
    });
    return result;
  }, [intruderEvents, filter, sortDesc]);

  // Stats
  const stats = useMemo(() => ({
    total: intruderEvents.length,
    critical: intruderEvents.filter((e) => (e.risk_score ?? 0) >= 80).length,
    thisWeek: intruderEvents.filter((e) => (Date.now() - new Date(e.created_at).getTime()) / 86400000 <= 7).length,
    newEvents: intruderEvents.filter((e) => e.status === "new").length,
  }), [intruderEvents]);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Intruder Center"
        subtitle="AI-powered unauthorized access detection and evidence management"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Attempts", value: stats.total, color: "#64748B", icon: Camera },
          { label: "Critical Events", value: stats.critical, color: "#EF4444", icon: AlertTriangle },
          { label: "This Week", value: stats.thisWeek, color: "#F97316", icon: Clock },
          { label: "New Alerts", value: stats.newEvents, color: "#00E5FF", icon: Shield },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5" style={{ background: stat.color, filter: "blur(16px)", transform: "translate(30%, -30%)" }} />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}1A` }}>
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-xs text-muted">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {RISK_LEVELS.map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap capitalize transition-all ${filter === r
                ? "gradient-accent text-white shadow-glow"
                : "bg-base-surface text-muted border border-base-border hover:text-white hover:bg-base-elevated"
                }`}
            >
              {r === "all" ? "All Events" : r}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSortDesc(!sortDesc)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted border border-base-border bg-base-surface hover:text-white hover:bg-base-elevated transition-all"
        >
          <SortDesc className="w-3.5 h-3.5" />
          {sortDesc ? "Newest First" : "Oldest First"}
        </button>
      </div>

      {/* Event list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Shield className="w-12 h-12" />}
          title={filter === "all" ? "No Intruder Events" : `No ${filter} events`}
          message={filter === "all"
            ? "Your vault is secure. No unauthorized access attempts have been detected."
            : `No ${filter} risk events found. Try adjusting your filter.`
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <IntruderCard event={event} onClick={() => setSelected(event)} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Intruder Event Details" size="lg">
        {selected && <IntruderDetail event={selected} onClose={() => setSelected(null)} />}
      </Modal>
    </div>
  );
}

function IntruderCard({ event, onClick }: { event: IntruderEvent; onClick: () => void }) {
  const riskColor = getRiskColor(event.risk_score);
  const riskLabel = getRiskLabel(event.risk_score);

  return (
    <Card hover onClick={onClick} className="relative overflow-hidden">
      {/* Risk severity left bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: riskColor }} />

      <div className="flex items-start gap-4 pl-2">
        {/* Camera icon / image placeholder */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden"
          style={{ background: `${riskColor}1A`, border: `1px solid ${riskColor}30` }}
        >
          {event.photo_base64 || event.image_url ? (
            <img 
              src={(event.photo_base64 && event.photo_base64.length > 20) ? event.photo_base64 : (event.image_url || "")} 
              alt="Intruder" 
              className="w-full h-full object-cover" 
              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add('broken-img-fallback'); }}
            />
          ) : (
            <Camera className="w-6 h-6" style={{ color: riskColor }} />
          )}
          {/* Scan line animation */}
          <div
            className="absolute inset-x-0 h-px opacity-60"
            style={{
              background: `linear-gradient(90deg, transparent, ${riskColor}, transparent)`,
              animation: "scan 2s linear infinite",
            }}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-sm font-semibold text-white">
                Unauthorized Access Attempt
              </p>
              <p className="text-xs text-muted mt-0.5">
                {format(new Date(event.created_at), "PPp")}
                {" · "}
                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {event.status === "new" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white animate-pulse" style={{ background: "#EF4444" }}>
                  NEW
                </span>
              )}
              <Badge color={riskColor}>{riskLabel}</Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {event.risk_score !== null && event.risk_score !== undefined && (
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-muted" />
                <span className="text-xs text-muted">Risk: <span className="font-semibold" style={{ color: riskColor }}>{event.risk_score}%</span></span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted" />
                <span className="text-xs text-muted truncate max-w-[120px]">{event.location}</span>
              </div>
            )}
            {event.device_info && (
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-muted" />
                <span className="text-xs text-muted truncate max-w-[100px]">{event.device_info}</span>
              </div>
            )}
          </div>
        </div>

        <Eye className="w-4 h-4 text-muted-faint flex-shrink-0 self-center" />
      </div>
    </Card>
  );
}

function IntruderDetail({ event, onClose }: { event: IntruderEvent; onClose: () => void }) {
  const riskColor = getRiskColor(event.risk_score);

  const factors = [
    { label: "Unknown Face", active: true, color: "#EF4444" },
    { label: "Unknown Location", active: !event.location?.includes("Home"), color: "#F97316" },
    { label: "New Device", active: true, color: "#F59E0B" },
    { label: "Multiple Failed Attempts", active: (event.failed_attempts ?? 0) > 2, color: "#EF4444" },
    { label: "Off-hours Access", active: new Date(event.created_at).getHours() >= 0 && new Date(event.created_at).getHours() <= 5, color: "#F59E0B" },
  ].filter((f) => f.active);

  return (
    <div className="space-y-5">
      {/* Risk header */}
      <div
        className="flex items-center gap-4 p-4 rounded-2xl border"
        style={{ background: `${riskColor}0D`, borderColor: `${riskColor}30` }}
      >
        <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden" style={{ background: `${riskColor}1A` }}>
          {event.photo_base64 || event.image_url ? (
            <img 
              src={(event.photo_base64 && event.photo_base64.length > 20) ? event.photo_base64 : (event.image_url || "")} 
              alt="Intruder" 
              className="w-full h-full object-cover" 
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <Camera className="w-7 h-7" style={{ color: riskColor }} />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">Unauthorized Access Attempt</p>
          <p className="text-xs text-muted">{format(new Date(event.created_at), "PPPP")} at {format(new Date(event.created_at), "p")}</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-black" style={{ color: riskColor }}>{event.risk_score ?? "—"}%</p>
          <p className="text-[10px] text-muted uppercase tracking-wider">Risk Score</p>
        </div>
      </div>

      {/* Evidence grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Location", value: event.location ?? event.location_label ?? "Unknown", icon: MapPin },
          { label: "Device", value: event.device_info ?? event.device_name ?? "Unknown device", icon: Smartphone },
          { label: "Status", value: event.status ?? "Logged", icon: Shield },
          { label: "Match Conf.", value: event.match_confidence ? `${event.match_confidence}%` : "N/A", icon: AlertTriangle },
          { label: "Sync Status", value: event.sync_status ?? "synced", icon: Clock },
          { label: "Liveness", value: event.liveness_result ?? "N/A", icon: Eye },
        ].map((row) => (
          <div key={row.label} className="p-3 rounded-xl bg-base-surface">
            <div className="flex items-center gap-2 mb-1">
              <row.icon className="w-3.5 h-3.5 text-muted" />
              <p className="text-[10px] text-muted uppercase tracking-wider">{row.label}</p>
            </div>
            <p className="text-sm text-white font-medium truncate">{row.value}</p>
          </div>
        ))}
      </div>

      {/* AI Explanation */}
      {factors.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-light uppercase tracking-wider mb-3">AI Risk Factors</h4>
          <div className="space-y-2">
            {factors.map((f) => (
              <div key={f.label} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: `${f.color}0D`, border: `1px solid ${f.color}20` }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: f.color }} />
                <span className="text-sm text-muted-light">{f.label}</span>
                <span className="ml-auto text-xs font-medium" style={{ color: f.color }}>Detected</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI recommendation */}
      <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
        <p className="text-xs font-semibold text-accent mb-1">AI Recommendation</p>
        <p className="text-sm text-muted-light">
          {(event.risk_score ?? 0) >= 80
            ? "This is a critical security event. Review the evidence carefully and consider changing your PIN and updating your trusted devices list."
            : (event.risk_score ?? 0) >= 60
              ? "High-risk event detected. Monitor for repeated attempts and ensure your PIN is strong and unique."
              : "Moderate risk event. Keep an eye on your activity and ensure your security settings are up to date."}
        </p>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <Button variant="secondary" onClick={onClose} className="flex-1">Close</Button>
        <Button onClick={() => generateIntruderReport(event)} className="flex-1" icon={<Download className="w-4 h-4" />}>
          Export Report
        </Button>
      </div>
    </div>
  );
}
