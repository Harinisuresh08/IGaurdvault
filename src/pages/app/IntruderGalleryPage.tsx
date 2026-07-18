import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  MapPin,
  Clock,
  Battery,
  Wifi,
  Bluetooth,
  Search,
  Filter,
  Trash2,
  Eye,
  X,
  ShieldAlert,
} from "lucide-react";
import {
  Card,
  SectionTitle,
  Badge,
  Button,
  Spinner,
} from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import { supabase } from "@/lib/supabase";
import { colorForTier, labelForTier } from "@/lib/securityEngine";
import { format, formatDistanceToNow } from "date-fns";
import type { IntruderEvent, ThreatLevel } from "@/types";

export default function IntruderGalleryPage() {
  const { user } = useAuthStore();
  const { intruderEvents, loaded, loadAll } = useDataStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ThreatLevel>("all");
  const [selected, setSelected] = useState<IntruderEvent | null>(null);

  const filtered = useMemo(() => {
    return intruderEvents.filter((e) => {
      if (filter !== "all" && e.threat_level !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          e.location_label?.toLowerCase().includes(q) ||
          e.device_name?.toLowerCase().includes(q) ||
          e.threat_level.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [intruderEvents, query, filter]);

  async function deleteEvent(id: string) {
    if (!user) return;
    await supabase.from("intruder_events").delete().eq("id", id);
    await loadAll(user.id);
    setSelected(null);
  }

  if (!loaded) {
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
          <h1 className="text-2xl font-bold text-white">Intruder Gallery</h1>
          <p className="mt-1 text-sm text-muted">
            All captured intruder evidence with full forensic metadata.
          </p>
        </div>
        <Badge color={intruderEvents.length > 0 ? "danger" : "success"}>
          <ShieldAlert size={12} />
          {intruderEvents.length} intruder{intruderEvents.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-faint"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by location, device, threat…"
              className="w-full rounded-xl border border-base-border bg-base-surface py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-muted-faint focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted" />
            {(["all", "low", "medium", "high", "critical"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  filter === f
                    ? "bg-accent text-base-bg"
                    : "bg-base-elevated text-muted hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <Camera size={40} className="text-muted-faint" />
          <p className="mt-3 text-sm font-medium text-white">No intruders found</p>
          <p className="text-xs text-muted">
            {intruderEvents.length === 0
              ? "Your device hasn't detected any unauthorized access attempts."
              : "No events match your current filter."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e, i) => {
            const color = colorForTier(e.threat_level as ThreatLevel);
            return (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="group cursor-pointer overflow-hidden p-0" onClick={() => setSelected(e)}>
                  <div className="relative aspect-video overflow-hidden bg-base-surface">
                    {e.photo_base64 ? (
                      <img
                        src={e.photo_base64}
                        alt="Intruder"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Camera size={32} className="text-muted-faint" />
                      </div>
                    )}
                    <div
                      className="absolute inset-x-0 top-0 flex items-center justify-between p-2"
                      style={{
                        background: `linear-gradient(180deg, ${color}40, transparent)`,
                      }}
                    >
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                        style={{ background: color }}
                      >
                        {labelForTier(e.threat_level as ThreatLevel)}
                      </span>
                      <span className="rounded-full bg-black/50 px-2 py-0.5 font-mono text-[10px] text-white">
                        {(e.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="p-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white">
                        {e.location_label ?? "Unknown location"}
                      </p>
                      <Eye size={14} className="text-muted" />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {format(new Date(e.created_at), "MMM d, HH:mm")}
                      </span>
                      {e.battery_percentage != null && (
                        <span className="flex items-center gap-1">
                          <Battery size={10} />
                          {e.battery_percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {selected && (
        <IntruderDetail
          event={selected}
          onClose={() => setSelected(null)}
          onDelete={() => deleteEvent(selected.id)}
        />
      )}
    </div>
  );
}

function IntruderDetail({
  event,
  onClose,
  onDelete,
}: {
  event: IntruderEvent;
  onClose: () => void;
  onDelete: () => void;
}) {
  const color = colorForTier(event.threat_level as ThreatLevel);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-base-border bg-base-card p-6"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-muted hover:bg-base-elevated hover:text-white"
        >
          <X size={18} />
        </button>
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: `${color}1a`, color }}
          >
            <ShieldAlert size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Intruder Evidence</h2>
            <p className="text-xs text-muted">
              {format(new Date(event.created_at), "PPP 'at' p")} ·{" "}
              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        {event.photo_base64 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-base-border">
            <img
              src={event.photo_base64}
              alt="Intruder capture"
              className="w-full object-cover"
            />
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Detail icon={<MapPin size={14} />} label="Location" value={event.location_label ?? "Unknown"} />
          <Detail icon={<Clock size={14} />} label="Time" value={format(new Date(event.created_at), "HH:mm:ss")} />
          <Detail icon={<Camera size={14} />} label="Device" value={event.device_name ?? "Unknown"} />
          <Detail icon={<Camera size={14} />} label="Model" value={event.phone_model ?? "Unknown"} />
          <Detail icon={<Wifi size={14} />} label="Wi-Fi" value={event.wifi_status ?? "Unknown"} />
          <Detail icon={<Bluetooth size={14} />} label="Bluetooth" value={event.bluetooth_status ?? "Unknown"} />
          <Detail icon={<Battery size={14} />} label="Battery" value={`${event.battery_percentage ?? "—"}%`} />
          <Detail icon={<Battery size={14} />} label="Charging" value={event.charging_status ?? "Unknown"} />
          <Detail icon={<Wifi size={14} />} label="Network" value={event.network_type ?? "Unknown"} />
          <Detail icon={<Camera size={14} />} label="OS" value={event.os_version ?? "Unknown"} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-base-border bg-base-surface/50 p-4">
            <p className="text-xs text-muted">Confidence Score</p>
            <p className="mt-1 font-mono text-2xl font-bold" style={{ color }}>
              {(event.confidence_score * 100).toFixed(1)}%
            </p>
          </div>
          <div className="rounded-xl border border-base-border bg-base-surface/50 p-4">
            <p className="text-xs text-muted">Threat Level</p>
            <p className="mt-1 text-lg font-bold capitalize" style={{ color }}>
              {labelForTier(event.threat_level as ThreatLevel)}
            </p>
          </div>
        </div>

        {event.latitude != null && event.longitude != null && (
          <div className="mt-4 overflow-hidden rounded-xl border border-base-border">
            <iframe
              title="Location map"
              className="h-48 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${event.longitude - 0.01},${event.latitude - 0.01},${event.longitude + 0.01},${event.latitude + 0.01}&layer=mapnik&marker=${event.latitude},${event.longitude}`}
            />
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button variant="danger" className="flex-1" onClick={onDelete}>
            <Trash2 size={16} />
            Delete Evidence
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-base-border bg-base-surface/40 p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
