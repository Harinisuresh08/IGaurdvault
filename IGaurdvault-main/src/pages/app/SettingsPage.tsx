import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, Bell, MapPin, Smartphone, Palette, Download, Upload, Trash2, KeyRound, ScanFace, Fingerprint, Clock, LogOut, ChevronRight, TriangleAlert as AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { lockVault } from "@/lib/crypto";
import { logSecurityEvent } from "@/lib/securityService";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Button, Toggle, Badge, Modal } from "@/components/ui";
import type { UserSettings } from "@/types";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { profile, updateSettings, signOut, user } = useAuthStore();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(profile?.settings ?? null);

  if (!profile || !settings) return null;

  const handleToggle = (key: keyof UserSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    updateSettings({ [key]: settings[key] });
  };

  const handleSignOut = async () => {
    if (user) logSecurityEvent({ user_id: user.id, type: "login_failure" as never, severity: "info", title: "Signed Out", description: "User signed out from settings" });
    lockVault();
    await signOut();
    navigate("/auth/login");
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <PageHeader title="Settings" subtitle="Manage your security preferences and account" />

      <div className="space-y-4">
        {/* Authentication */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-accent" /> Authentication</h3>
          <div className="space-y-3">
            <SettingRow icon={<ScanFace className="w-4 h-4" />} title="Face Recognition" desc="Unlock vault with face match" >
              <Toggle checked={settings.face_recognition} onChange={() => handleToggle("face_recognition")} />
            </SettingRow>
            <SettingRow icon={<KeyRound className="w-4 h-4" />} title="PIN Authentication" desc="Require PIN to unlock vault">
              <Toggle checked={settings.pin_auth} onChange={() => handleToggle("pin_auth")} />
            </SettingRow>
            <SettingRow icon={<Fingerprint className="w-4 h-4" />} title="Biometric Auth" desc="Use device biometrics">
              <Toggle checked={settings.biometric_auth} onChange={() => handleToggle("biometric_auth")} />
            </SettingRow>
            <SettingRow icon={<Clock className="w-4 h-4" />} title="Auto-Lock" desc="Lock vault after inactivity">
              <select value={settings.auto_lock_minutes} onChange={(e) => { const v = Number(e.target.value); setSettings({ ...settings, auto_lock_minutes: v }); updateSettings({ auto_lock_minutes: v }); }} className="bg-base-surface border border-base-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent">
                <option value={1}>1 minute</option><option value={5}>5 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option>
              </select>
            </SettingRow>
          </div>
        </Card>

        {/* Security */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Lock className="w-4 h-4 text-accent" /> Security Preferences</h3>
          <div className="space-y-3">
            <SettingRow icon={<ScanFace className="w-4 h-4" />} title="Behavior Detection" desc="AI-powered anomaly detection">
              <Toggle checked={settings.behavior_detection} onChange={() => handleToggle("behavior_detection")} />
            </SettingRow>
            <SettingRow icon={<MapPin className="w-4 h-4" />} title="Location Tracking" desc="Track access locations">
              <Toggle checked={settings.location_tracking} onChange={() => handleToggle("location_tracking")} />
            </SettingRow>
            <SettingRow icon={<Smartphone className="w-4 h-4" />} title="Device Monitoring" desc="Monitor trusted devices">
              <Toggle checked={settings.trusted_devices_monitoring} onChange={() => handleToggle("trusted_devices_monitoring")} />
            </SettingRow>
            <SettingRow icon={<MapPin className="w-4 h-4" />} title="Location Monitoring" desc="Monitor trusted locations">
              <Toggle checked={settings.trusted_locations_monitoring} onChange={() => handleToggle("trusted_locations_monitoring")} />
            </SettingRow>
            <SettingRow icon={<AlertTriangle className="w-4 h-4" />} title="Emergency Mode" desc="Capture intruder images on failed access">
              <Toggle checked={settings.emergency_mode} onChange={() => handleToggle("emergency_mode")} />
            </SettingRow>
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Bell className="w-4 h-4 text-accent" /> Notifications</h3>
          <SettingRow icon={<Bell className="w-4 h-4" />} title="Push Notifications" desc="Receive security alerts">
            <Toggle checked={settings.notifications} onChange={() => handleToggle("notifications")} />
          </SettingRow>
        </Card>

        {/* Appearance */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Palette className="w-4 h-4 text-accent" /> Appearance</h3>
          <SettingRow icon={<Palette className="w-4 h-4" />} title="Dark Mode" desc="Use dark theme">
            <Toggle checked={settings.dark_mode} onChange={() => handleToggle("dark_mode")} />
          </SettingRow>
        </Card>

        {/* Backup & Restore */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Download className="w-4 h-4 text-accent" /> Backup & Restore</h3>
          <div className="space-y-2">
            <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-base-surface hover:bg-base-elevated transition-all text-left">
              <Download className="w-4 h-4 text-accent" />
              <div className="flex-1"><p className="text-sm text-white">Create Backup</p><p className="text-xs text-muted">Export encrypted vault data</p></div>
              <ChevronRight className="w-4 h-4 text-muted" />
            </button>
            <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-base-surface hover:bg-base-elevated transition-all text-left">
              <Upload className="w-4 h-4 text-accent" />
              <div className="flex-1"><p className="text-sm text-white">Restore Backup</p><p className="text-xs text-muted">Import encrypted vault data</p></div>
              <ChevronRight className="w-4 h-4 text-muted" />
            </button>
          </div>
        </Card>

        {/* Account */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">Account</h3>
          <div className="space-y-2">
            <button onClick={handleSignOut} className="w-full flex items-center gap-3 p-3 rounded-xl bg-base-surface hover:bg-base-elevated transition-all text-left">
              <LogOut className="w-4 h-4 text-muted" />
              <span className="text-sm text-white flex-1">Sign Out</span>
              <ChevronRight className="w-4 h-4 text-muted" />
            </button>
            <button onClick={() => setDeleteOpen(true)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-danger-soft hover:bg-danger/10 transition-all text-left border border-danger/20">
              <Trash2 className="w-4 h-4 text-danger" />
              <span className="text-sm text-danger flex-1">Delete Account</span>
              <ChevronRight className="w-4 h-4 text-danger" />
            </button>
          </div>
        </Card>

        <div className="text-center py-4">
          <Badge color="#00E5FF">iGuard One v1.0.0</Badge>
          <p className="text-xs text-muted-faint mt-2">AI Personal Digital Guardian</p>
        </div>
      </div>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Account" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-danger-soft border border-danger/20">
            <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0" />
            <p className="text-sm text-danger">This will permanently delete your account, vault items, passwords, and all security data. This action cannot be undone.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="danger" onClick={() => setDeleteOpen(false)} className="flex-1">Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SettingRow({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-base-surface">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="text-muted flex-shrink-0">{icon}</div>
        <div className="min-w-0"><p className="text-sm text-white">{title}</p><p className="text-xs text-muted">{desc}</p></div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
