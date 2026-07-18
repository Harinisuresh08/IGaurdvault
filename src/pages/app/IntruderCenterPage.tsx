import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TriangleAlert as AlertTriangle, Eye, MapPin, Smartphone, Wifi, Battery, Clock, Shield, X, Activity, Camera, Zap } from "lucide-react";
import { useDataStore } from "@/stores/dataStore";
import { riskColor, riskLabel } from "@/lib/securityEngine";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Badge, Modal, EmptyState } from "@/components/ui";
import { format } from "date-fns";
import type { IntruderEvent } from "@/types";

export default function IntruderCenterPage() {
  const { intruderEvents } = useDataStore();
  const [selected, setSelected] = useState<IntruderEvent | null>(null);
  const [filter, setFilter] = useState<"all" | "new" | "reviewed" | "resolved">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return intruderEvents;
    return intruderEvents.filter((e) => e.status === filter);
  }, [intruderEvents, filter]);

  const newCount = intruderEvents.filter((e) => e.status === "new").length;
  const criticalCount = intruderEvents.filter((e) => e.threat_level === "critical" || e.threat_level === "high").length;
  const avgRisk = intruderEvents.length > 0
    ? Math.round(intruderEvents.reduce((a, e) => a + e.confidence_score, 0) / intruderEvents.length)
    : 0;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader title="Intruder Center" subtitle="Unauthorized access attempts with AI-powered threat analysis" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-danger-soft flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-danger" /></div><div><p className="text-xs text-muted">Total Events</p><p className="text-lg font-bold text-white">{intruderEvents.length}</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: newCount > 0 ? "#EF444422" : "#22C55E22" }}><Shield className="w-6 h-6" style={{ color: newCount > 0 ? "#EF4444" : "#22C55E" }} /></div><div><p className="text-xs text-muted">New Alerts</p><p className="text-lg font-bold text-white">{newCount}</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: criticalCount > 0 ? "#F9731622" : "#22C55E22" }}><Zap className="w-6 h-6" style={{ color: criticalCount > 0 ? "#F97316" : "#22C55E" }} /></div><div><p className="text-xs text-muted">High/Critical</p><p className="text-lg font-bold text-white">{criticalCount}</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-base-surface flex items-center justify-center"><Activity className="w-6 h-6 text-accent" /></div><div><p className="text-xs text-muted">Avg Risk</p><p className="text-lg font-bold text-white">{avgRisk}%</p></div></div></Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {([["all", "All"], ["new", "New"], ["reviewed", "Reviewed"], ["resolved", "Resolved"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filter === key ? "bg-accent-soft text-accent border border-accent/30" : "bg-base-surface text-muted-light border border-base-border hover:bg-base-elevated"}`}>{label}</button>
        ))}
      </div>

      {/* Events */}
      {filtered.length === 0 ? (
        <EmptyState icon={<Shield className="w-12 h-12" />} title="No intruder events" message="No unauthorized access attempts have been detected. Your vault is secure." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((event, i) => (
            <motion.div key={event.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="cursor-pointer hover:border-danger/30 transition-all" onClick={() => setSelected(event)}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-base-surface flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {event.photo_base64 ? (
                      <img src={event.photo_base64.startsWith("data:") ? event.photo_base64 : `data:image/jpeg;base64,${event.photo_base64}`} alt="Intruder" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{format(new Date(event.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                    <p className="text-xs text-muted truncate">{event.location_label ?? "Unknown location"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge color={riskColor(event.threat_level)}>{riskLabel(event.threat_level)}</Badge>
                  <Badge color={event.status === "new" ? "#EF4444" : event.status === "reviewed" ? "#F59E0B" : "#22C55E"}>{event.status}</Badge>
                  <span className="text-xs text-muted ml-auto">Risk: {Math.round(event.confidence_score)}%</span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Intruder Report" size="lg">
        {selected && (
          <div className="space-y-4">
            {/* Photo */}
            {selected.photo_base64 && (
              <div className="rounded-xl overflow-hidden bg-base-surface max-h-64 flex items-center justify-center">
                <img src={selected.photo_base64.startsWith("data:") ? selected.photo_base64 : `data:image/jpeg;base64,${selected.photo_base64}`} alt="Intruder" className="w-full max-h-64 object-contain" />
              </div>
            )}

            {/* Threat Level */}
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl" style={{ background: `${riskColor(selected.threat_level)}22`, border: `1px solid ${riskColor(selected.threat_level)}44` }}>
                <p className="text-xs text-muted uppercase tracking-wider">Threat Level</p>
                <p className="text-lg font-bold" style={{ color: riskColor(selected.threat_level) }}>{riskLabel(selected.threat_level)}</p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-base-surface">
                <p className="text-xs text-muted uppercase tracking-wider">Risk Score</p>
                <p className="text-lg font-bold text-white">{Math.round(selected.confidence_score)}%</p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-base-surface">
                <p className="text-xs text-muted uppercase tracking-wider">Status</p>
                <p className="text-lg font-bold text-white capitalize">{selected.status}</p>
              </div>
            </div>

            {/* AI Explanation */}
            {selected.ai_explanation && (
              <div className="p-4 rounded-xl bg-accent-soft border border-accent/20">
                <p className="text-xs text-accent uppercase tracking-wider mb-1 flex items-center gap-1"><Eye className="w-3 h-3" /> AI Analysis</p>
                <p className="text-sm text-white">{selected.ai_explanation}</p>
              </div>
            )}

            {/* Evidence */}
            <div className="grid grid-cols-2 gap-3">
              <EvidenceRow icon={<Clock className="w-4 h-4" />} label="Timestamp" value={format(new Date(selected.created_at), "MMM d, yyyy 'at' h:mm a")} />
              <EvidenceRow icon={<MapPin className="w-4 h-4" />} label="Location" value={selected.location_label ?? "Unknown"} />
              <EvidenceRow icon={<Smartphone className="w-4 h-4" />} label="Device" value={selected.device_name ?? "Unknown"} />
              <EvidenceRow icon={<Wifi className="w-4 h-4" />} label="Network" value={selected.network_type ?? "Unknown"} />
              {selected.battery_percentage != null && <EvidenceRow icon={<Battery className="w-4 h-4" />} label="Battery" value={`${selected.battery_percentage}%`} />}
              {selected.os_version && <EvidenceRow icon={<Smartphone className="w-4 h-4" />} label="OS Version" value={selected.os_version} />}
            </div>

            {/* Evidence JSON */}
            {Object.keys(selected.evidence).length > 0 && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wider mb-2">Raw Evidence</p>
                <pre className="text-xs text-muted-light bg-base-surface p-3 rounded-xl overflow-x-auto">{JSON.stringify(selected.evidence, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function EvidenceRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-base-surface">
      <div className="text-muted flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted uppercase tracking-wider">{label}</p>
        <p className="text-sm text-white truncate">{value}</p>
      </div>
    </div>
  );
}
