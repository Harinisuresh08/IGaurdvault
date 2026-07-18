import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Plus,
  Trash2,
  Home,
  Briefcase,
  GraduationCap,
  Shield,
  X,
  LocateFixed,
  Loader2,
} from "lucide-react";
import { Card, SectionTitle, Badge, Button, Spinner } from "@/components/ui";
import { Field } from "@/components/auth/Field";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import { supabase } from "@/lib/supabase";
import { getGeoInfo, haversineKm } from "@/lib/device";
import { logThreatEvent } from "@/lib/securityService";
import type { TrustedLocation } from "@/types";

const CATEGORIES = [
  { key: "home", label: "Home", icon: Home, color: "#22C55E" },
  { key: "office", label: "Office", icon: Briefcase, color: "#00E5FF" },
  { key: "college", label: "College", icon: GraduationCap, color: "#F59E0B" },
  { key: "safe", label: "Safe Place", icon: Shield, color: "#FB7185" },
];

export default function TrustedLocationsPage() {
  const { user } = useAuthStore();
  const { trustedLocations, loaded, loadAll } = useDataStore();
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("home");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("150");
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  async function useMyLocation() {
    setLocating(true);
    const geo = await getGeoInfo();
    if (geo) {
      setLat(geo.latitude.toFixed(5));
      setLng(geo.longitude.toFixed(5));
    }
    setLocating(false);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const cat = CATEGORIES.find((c) => c.key === category)!;
    await supabase.from("trusted_locations").insert({
      user_id: user.id,
      label: label.trim() || cat.label,
      category,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      radius_m: parseInt(radius) || 150,
      icon: category,
    });
    await loadAll(user.id);
    setSaving(false);
    setShowAdd(false);
    setLabel("");
    setLat("");
    setLng("");
  }

  async function remove(loc: TrustedLocation) {
    if (!user) return;
    await supabase.from("trusted_locations").delete().eq("id", loc.id);
    await loadAll(user.id);
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trusted Locations</h1>
          <p className="mt-1 text-sm text-muted">
            Authentication outside these safe zones raises your risk score.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          Add Location
        </Button>
      </div>

      {trustedLocations.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <MapPin size={40} className="text-muted-faint" />
          <p className="mt-3 text-sm font-medium text-white">No trusted locations</p>
          <p className="text-xs text-muted">
            Add Home, Office, or College to reduce false-positive risk scoring.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {trustedLocations.map((loc, i) => {
            const cat = CATEGORIES.find((c) => c.key === loc.category) ?? CATEGORIES[3];
            const Icon = cat.icon;
            return (
              <motion.div
                key={loc.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="overflow-hidden p-0">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-xl"
                        style={{ background: `${cat.color}1a`, color: cat.color }}
                      >
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{loc.label}</p>
                        <p className="text-xs capitalize text-muted">
                          {loc.category} · {loc.radius_m}m radius
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => remove(loc)}
                      className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="h-32 w-full overflow-hidden border-t border-base-border">
                    <iframe
                      title={`map-${loc.id}`}
                      className="h-full w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${loc.longitude - 0.01},${loc.latitude - 0.01},${loc.longitude + 0.01},${loc.latitude + 0.01}&layer=mapnik&marker=${loc.latitude},${loc.longitude}`}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 text-xs text-muted">
                    <span className="font-mono">
                      {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    </span>
                    <Badge color="success">Trusted</Badge>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAdd(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={save}
              className="relative w-full max-w-md space-y-4 rounded-2xl border border-base-border bg-base-card p-6"
            >
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="absolute right-4 top-4 rounded-lg p-2 text-muted hover:bg-base-elevated"
              >
                <X size={18} />
              </button>
              <div>
                <h2 className="text-lg font-bold text-white">Add Trusted Location</h2>
                <p className="text-xs text-muted">Save a safe zone for authentication.</p>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
                  Category
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => {
                          setCategory(c.key);
                          if (!label) setLabel(c.label);
                        }}
                        className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 transition-all ${
                          category === c.key
                            ? "border-accent bg-accent/10"
                            : "border-base-border hover:border-accent/40"
                        }`}
                      >
                        <Icon size={18} style={{ color: c.color }} />
                        <span className="text-[10px] text-muted-light">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Field
                label="Label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Home"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Latitude"
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="40.7128"
                  required
                />
                <Field
                  label="Longitude"
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="-74.0060"
                  required
                />
              </div>
              <Field
                label="Radius (meters)"
                type="number"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                placeholder="150"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={useMyLocation}
                disabled={locating}
                className="w-full"
              >
                {locating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <LocateFixed size={14} />
                )}
                Use my current location
              </Button>
              <Button type="submit" size="lg" className="w-full" disabled={saving}>
                {saving ? "Saving…" : "Save Trusted Location"}
              </Button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { haversineKm };
