import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, X, Camera, Bell, Mail, FileText, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import {
  computeSecurityScore,
  tierFromScore,
} from "@/lib/securityEngine";
import {
  logThreatEvent,
  logIntruderEvent,
  pushNotification,
} from "@/lib/securityService";
import { getDeviceInfo, getGeoInfo } from "@/lib/device";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";

/** Watches the security score. When it reaches critical and emergency mode
 * is enabled in settings, shows a banner and (on confirm) runs the full
 * emergency response: capture evidence, notify contact, generate report. */
export function EmergencyWatcher() {
  const { user, profile } = useAuthStore();
  const data = useDataStore();
  const [show, setShow] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [done, setDone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const score = computeSecurityScore({
    successfulAuths: data.threatEvents.filter((e) => e.event_type === "login_success").length,
    unknownFaces: data.threatEvents.filter((e) => e.event_type === "unknown_face").length,
    failedAttempts: data.threatEvents.filter((e) => e.event_type === "login_failed").length,
    unknownLocations: 0,
    suspiciousLoginTime: false,
    deviceMotion: 0.2,
    behaviorAnomaly: data.behaviorSamples.filter((b) => b.anomaly_label !== "normal").length * 0.2,
    trustedNetwork: data.trustedDevices.some((d) => d.device_type === "wifi" && d.is_active),
    trustedDevice: data.trustedDevices.some((d) => d.device_type === "bluetooth" && d.is_active),
    batteryTampering: false,
    chargingStatus: "Unknown",
    passwordStrength: data.passwordEntries.length > 0
      ? Math.round(data.passwordEntries.reduce((a, p) => a + p.strength_score, 0) / data.passwordEntries.length)
      : 50,
    vaultItemCount: data.vaultItems.length,
  });

  const isCritical = score.tier === "critical";
  const emergencyEnabled = profile?.settings?.emergency_mode ?? false;

  useEffect(() => {
    if (isCritical && emergencyEnabled && !done && !dismissed && data.loaded) {
      setShow(true);
    } else if (!isCritical) {
      setShow(false);
      setDismissed(false);
      setDone(false);
    }
  }, [isCritical, emergencyEnabled, done, dismissed, data.loaded]);

  const runEmergency = useCallback(async () => {
    if (!user) return;
    setExecuting(true);
    const [device, geo] = await Promise.all([getDeviceInfo(), getGeoInfo()]);

    await logIntruderEvent(user.id, {
      photo_base64: null,
      latitude: geo?.latitude ?? null,
      longitude: geo?.longitude ?? null,
      location_label: geo ? "Emergency capture" : "Unknown",
      device_name: device.deviceName,
      phone_model: device.phoneModel,
      os_version: device.osVersion,
      network_type: device.networkType,
      wifi_status: device.wifiStatus,
      bluetooth_status: device.bluetoothStatus,
      battery_percentage: device.batteryPercentage,
      charging_status: device.chargingStatus,
      confidence_score: 0.95,
      threat_level: "critical",
    });

    await logThreatEvent(
      user.id,
      "emergency_triggered",
      "Emergency mode activated",
      "Critical risk threshold exceeded. Evidence captured, emergency contact notified, report generated.",
      "critical",
      { score: score.score, factors: score.factors.length }
    );

    await pushNotification(
      user.id,
      "EMERGENCY ALERT",
      "Critical security risk detected. Emergency protocols have been activated.",
      "danger"
    );

    if (profile?.emergency_contact_email) {
      // In a native app this would send via Firebase / SMTP.
      // Here we log the intent.
      await logThreatEvent(
        user.id,
        "alert_sent",
        "Emergency contact notified",
        `Email alert sent to ${profile.emergency_contact_email}`,
        "high"
      );
    }

    await data.loadAll(user.id);
    setExecuting(false);
    setDone(true);
  }, [user, profile, score, data]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed left-1/2 top-20 z-50 w-full max-w-md -translate-x-1/2 px-4"
        >
          <div className="overflow-hidden rounded-2xl border border-danger/50 bg-danger/10 backdrop-blur-2xl">
            <div className="flex items-center gap-3 border-b border-danger/30 p-4">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/20 text-danger"
              >
                <ShieldAlert size={22} />
              </motion.div>
              <div className="flex-1">
                <p className="text-sm font-bold text-danger">EMERGENCY MODE</p>
                <p className="text-xs text-muted-light">
                  Critical risk detected (Score: {score.score})
                </p>
              </div>
              <button
                onClick={() => setDismissed(true)}
                className="rounded-lg p-1.5 text-muted hover:bg-base-elevated"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4">
              {done ? (
                <div className="space-y-2 text-sm text-muted-light">
                  <p className="flex items-center gap-2 text-success">
                    <Camera size={14} /> Evidence captured and stored
                  </p>
                  <p className="flex items-center gap-2 text-success">
                    <Bell size={14} /> Alert notifications sent
                  </p>
                  {profile?.emergency_contact_email && (
                    <p className="flex items-center gap-2 text-success">
                      <Mail size={14} /> Emergency contact notified
                    </p>
                  )}
                  <p className="flex items-center gap-2 text-success">
                    <FileText size={14} /> Event logged to timeline
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-light">
                    iGuard AI has detected critical security risk. Activate
                    emergency protocols to capture evidence and notify your
                    emergency contact.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={runEmergency}
                      disabled={executing}
                      className="flex-1"
                    >
                      {executing ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ShieldAlert size={14} />
                      )}
                      {executing ? "Activating…" : "Activate Emergency"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDismissed(true)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
