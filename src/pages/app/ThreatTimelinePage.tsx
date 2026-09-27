import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LogIn,
  LogOut,
  ScanFace,
  Camera,
  Bell,
  MapPin,
  Activity,
  FileText,
  ShieldAlert,
  Settings as SettingsIcon,
  AlertCircle,
  Eye,
  Trash2,
  KeyRound,
  FolderPlus,
} from "lucide-react";
import { Card, SectionTitle, Badge, Spinner } from "@/components/ui";
import { useSecurityData } from "@/hooks/useSecurityData";
import { format, formatDistanceToNow } from "date-fns";
import type { EventType } from "@/types";
import clsx from "clsx";

const EVENT_META: Partial<Record<
  EventType,
  { icon: typeof LogIn; color: string; label: string }
>> = {
  login_success: { icon: LogIn, color: "#22C55E", label: "Login" },
  login_failure: { icon: LogOut, color: "#EF4444", label: "Failed Login" },
  unknown_face: { icon: ScanFace, color: "#F59E0B", label: "Unknown Face" },
  intruder_capture: { icon: Camera, color: "#EF4444", label: "Intruder" },
  alert_sent: { icon: Bell, color: "#00E5FF", label: "Alert" },
  location_change: { icon: MapPin, color: "#FB7185", label: "Location" },
  behavior_anomaly: { icon: Activity, color: "#F59E0B", label: "Anomaly" },
  report_generated: { icon: FileText, color: "#00E5FF", label: "Report" },
  emergency_triggered: { icon: ShieldAlert, color: "#EF4444", label: "Emergency" },
  face_registered: { icon: ScanFace, color: "#22C55E", label: "Enrollment" },
  setting_changed: { icon: SettingsIcon, color: "#5A6B86", label: "Settings" },
  vault_item_added: { icon: FileText, color: "#22C55E", label: "Vault Item Added" },
  vault_item_viewed: { icon: Eye, color: "#00E5FF", label: "Vault Item Viewed" },
  vault_item_deleted: { icon: Trash2, color: "#EF4444", label: "Vault Item Deleted" },
  password_added: { icon: KeyRound, color: "#22C55E", label: "Password Added" },
  folder_created: { icon: FolderPlus, color: "#00E5FF", label: "Folder Created" },
};

export default function ThreatTimelinePage() {
  const { threatEvents, loaded } = useSecurityData();
  const [filter, setFilter] = useState<"all" | "alerts" | "anomalies">("all");

  const filtered = useMemo(() => {
    if (filter === "alerts")
      return threatEvents.filter((e: any) =>
        ["intruder_capture", "unknown_face", "alert_sent", "emergency_triggered", "login_failure"].includes(
          e.event_type
        )
      );
    if (filter === "anomalies")
      return threatEvents.filter((e: any) =>
        ["behavior_anomaly", "location_change"].includes(e.event_type)
      );
    return threatEvents;
  }, [threatEvents, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const e of filtered) {
      const day = format(new Date(e.created_at), "yyyy-MM-dd");
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Threat Timeline</h1>
          <p className="mt-1 text-sm text-muted">
            A chronological view of every security event on your account.
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "alerts", "anomalies"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === f
                  ? "bg-accent text-base-bg"
                  : "bg-base-elevated text-muted hover:text-white"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {grouped.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <AlertCircle size={40} className="text-muted-faint" />
          <p className="mt-3 text-sm font-medium text-white">No events yet</p>
          <p className="text-xs text-muted">
            Security events will appear here as iGuard AI monitors your device.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {grouped.map(([day, events]) => (
            <div key={day}>
              <div className="mb-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-base-border" />
                <span className="rounded-full bg-base-elevated px-3 py-1 text-xs font-medium text-muted-light">
                  {format(new Date(day), "EEEE, MMM d")}
                </span>
                <div className="h-px flex-1 bg-base-border" />
              </div>

              <div className="relative space-y-4 pl-8">
                <div className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-accent/40 via-base-border to-transparent" />
                {events.map((e: any, i: number) => {
                  const meta = EVENT_META[e.event_type as EventType] ?? {
                    icon: AlertCircle,
                    color: "#5A6B86",
                    label: e.event_type,
                  };
                  const Icon = meta.icon;
                  return (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="relative"
                    >
                      <div
                        className="absolute -left-[22px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-base-bg"
                        style={{ background: `${meta.color}25`, color: meta.color }}
                      >
                        <Icon size={12} />
                      </div>
                      <Card className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-white">
                                {e.title}
                              </p>
                              <Badge color={meta.color}>
                                {meta.label}
                              </Badge>
                            </div>
                            {e.description && (
                              <p className="mt-1 text-xs text-muted">
                                {e.description}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 text-xs text-muted">
                            {format(new Date(e.created_at), "HH:mm")}
                          </span>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
