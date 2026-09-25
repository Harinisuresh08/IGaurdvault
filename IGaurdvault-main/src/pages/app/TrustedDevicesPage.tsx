import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bluetooth,
  Wifi,
  Plus,
  Trash2,
  X,
  Smartphone,
  Laptop,
  Headphones,
  Watch,
} from "lucide-react";
import { Card, SectionTitle, Badge, Button, Spinner } from "@/components/ui";
import { Field } from "@/components/auth/Field";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import { supabase } from "@/lib/supabase";
import type { TrustedDevice } from "@/types";

const SUGGESTED = [
  { name: "AirPods Pro", type: "bluetooth", id: "AC:DE:48:00:11:22", icon: Headphones },
  { name: "Galaxy Watch", type: "bluetooth", id: "AC:DE:48:00:33:44", icon: Watch },
  { name: "MacBook", type: "bluetooth", id: "AC:DE:48:00:55:66", icon: Laptop },
  { name: "Home Wi-Fi", type: "wifi", id: "MyHomeNetwork", icon: Wifi },
];

export default function TrustedDevicesPage() {
  const { user } = useAuthStore();
  const { trustedDevices, loaded, loadAll } = useDataStore();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"bluetooth" | "wifi">("bluetooth");
  const [identifier, setIdentifier] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    await supabase.from("trusted_devices").insert({
      user_id: user.id,
      device_name: name.trim(),
      device_type: type,
      identifier: identifier.trim(),
      is_active: true,
    });
    await loadAll(user.id);
    setSaving(false);
    setShowAdd(false);
    setName("");
    setIdentifier("");
  }

  async function toggle(dev: TrustedDevice) {
    if (!user) return;
    await supabase
      .from("trusted_devices")
      .update({ is_active: !dev.is_active })
      .eq("id", dev.id);
    await loadAll(user.id);
  }

  async function remove(dev: TrustedDevice) {
    if (!user) return;
    await supabase.from("trusted_devices").delete().eq("id", dev.id);
    await loadAll(user.id);
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trusted Devices</h1>
          <p className="mt-1 text-sm text-muted">
            Register Bluetooth devices and Wi-Fi networks. Unknown devices
            increase your risk score.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          Add Device
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Bluetooth size={18} />
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-white">
                {trustedDevices.filter((d) => d.device_type === "bluetooth").length}
              </p>
              <p className="text-xs text-muted">Bluetooth devices</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success">
              <Wifi size={18} />
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-white">
                {trustedDevices.filter((d) => d.device_type === "wifi").length}
              </p>
              <p className="text-xs text-muted">Wi-Fi networks</p>
            </div>
          </div>
        </Card>
      </div>

      {trustedDevices.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <Smartphone size={40} className="text-muted-faint" />
          <p className="mt-3 text-sm font-medium text-white">No trusted devices</p>
          <p className="text-xs text-muted">
            Add your headphones, watch, or home Wi-Fi to lower false positives.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {trustedDevices.map((d, i) => {
            const Icon = d.device_type === "bluetooth" ? Bluetooth : Wifi;
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                        d.device_type === "bluetooth"
                          ? "bg-accent/15 text-accent"
                          : "bg-success/15 text-success"
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {d.device_name}
                      </p>
                      <p className="truncate font-mono text-xs text-muted">
                        {d.identifier}
                      </p>
                    </div>
                    <button
                      onClick={() => toggle(d)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        d.is_active ? "bg-success" : "bg-base-elevated"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          d.is_active ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => remove(d)}
                      className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="mt-2.5">
                    {d.is_active ? (
                      <Badge color="success">Active · Trusted</Badge>
                    ) : (
                      <Badge color="muted">Disabled</Badge>
                    )}
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
                <h2 className="text-lg font-bold text-white">Add Trusted Device</h2>
                <p className="text-xs text-muted">Pair a Bluetooth device or Wi-Fi network.</p>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
                  Type
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["bluetooth", "wifi"] as const).map((t) => {
                    const Icon = t === "bluetooth" ? Bluetooth : Wifi;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm capitalize transition-all ${
                          type === t
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-base-border text-muted hover:text-white"
                        }`}
                      >
                        <Icon size={16} />
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Field
                label="Device Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. AirPods Pro"
                required
              />
              <Field
                label={type === "bluetooth" ? "MAC Address" : "SSID"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={type === "bluetooth" ? "AC:DE:48:00:11:22" : "MyHomeNetwork"}
                required
              />

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
                  Quick add
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTED.map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setName(s.name);
                          setType(s.type as "bluetooth" | "wifi");
                          setIdentifier(s.id);
                        }}
                        className="flex items-center gap-2 rounded-lg border border-base-border bg-base-surface/50 px-3 py-2 text-left text-xs text-muted-light transition-colors hover:border-accent/40"
                      >
                        <Icon size={14} className="text-accent" />
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={saving}>
                {saving ? "Saving…" : "Save Trusted Device"}
              </Button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
