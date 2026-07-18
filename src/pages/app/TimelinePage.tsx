import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock, LogIn, LogOut, ScanFace, Lock, KeyRound, Eye, Trash2, FolderPlus, Download, TriangleAlert as AlertTriangle, Lightbulb, Settings, FileText } from "lucide-react";
import { useDataStore } from "@/stores/dataStore";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Badge, EmptyState } from "@/components/ui";
import { formatDistanceToNow, format } from "date-fns";
import type { EventType } from "@/types";

const EVENT_ICONS: Record<EventType, typeof Clock> = {
  login_success: LogIn, login_failure: LogOut, face_match: ScanFace, face_mismatch: ScanFace,
  intruder_detected: AlertTriangle, vault_item_added: Lock, vault_item_viewed: Eye,
  vault_item_deleted: Trash2, password_added: KeyRound, password_viewed: Eye,
  folder_created: FolderPlus, backup_completed: Download, alert_generated: AlertTriangle,
  recommendation_generated: Lightbulb, setting_changed: Settings, report_generated: FileText,
};

const EVENT_COLORS: Record<string, string> = {
  login_success: "#22C55E", login_failure: "#EF4444", face_match: "#22C55E", face_mismatch: "#EF4444",
  intruder_detected: "#EF4444", vault_item_added: "#00E5FF", vault_item_viewed: "#00E5FF",
  vault_item_deleted: "#EF4444", password_added: "#22C55E", password_viewed: "#00E5FF",
  folder_created: "#00E5FF", backup_completed: "#22C55E", alert_generated: "#F59E0B",
  recommendation_generated: "#F59E0B", setting_changed: "#64748B", report_generated: "#8B5CF6",
};

export default function TimelinePage() {
  const { securityEvents } = useDataStore();
  const [filter, setFilter] = useState<"all" | "security" | "vault" | "alerts">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return securityEvents;
    if (filter === "security") return securityEvents.filter((e) => ["login_success", "login_failure", "face_match", "face_mismatch", "setting_changed"].includes(e.event_type));
    if (filter === "vault") return securityEvents.filter((e) => ["vault_item_added", "vault_item_viewed", "vault_item_deleted", "password_added", "password_viewed", "folder_created", "backup_completed"].includes(e.event_type));
    if (filter === "alerts") return securityEvents.filter((e) => ["intruder_detected", "alert_generated", "recommendation_generated", "report_generated"].includes(e.event_type));
    return securityEvents;
  }, [securityEvents, filter]);

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <PageHeader title="Security Timeline" subtitle="Chronological log of all security events" />

      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {([["all", "All Events"], ["security", "Security"], ["vault", "Vault Activity"], ["alerts", "Alerts"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filter === key ? "bg-accent-soft text-accent border border-accent/30" : "bg-base-surface text-muted-light border border-base-border hover:bg-base-elevated"}`}>{label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Clock className="w-12 h-12" />} title="No events yet" message="Security events will appear here as you use the app." />
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-base-border" />
          <div className="space-y-3">
            {filtered.map((event, i) => {
              const Icon = EVENT_ICONS[event.event_type as EventType] ?? Clock;
              const color = EVENT_COLORS[event.event_type] ?? "#64748B";
              return (
                <motion.div key={event.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="relative pl-12">
                  <div className="absolute left-2.5 top-3 w-3 h-3 rounded-full border-2 border-base-bg" style={{ background: color, boxShadow: `0 0 8px ${color}66` }} />
                  <Card className="pt-3 pb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}22` }}>
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{event.title}</p>
                        {event.description && <p className="text-xs text-muted mt-0.5">{event.description}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-faint">{format(new Date(event.created_at), "MMM d, h:mm a")}</span>
                          <span className="text-xs text-muted-faint">·</span>
                          <span className="text-xs text-muted-faint">{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</span>
                          <Badge color={color}>{event.severity}</Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
