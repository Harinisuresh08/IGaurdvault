import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, Shield, Calendar, CreditCard as Edit2, ScanFace, KeyRound, Bell } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Badge, Button } from "@/components/ui";
import { format } from "date-fns";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { profile, user } = useAuthStore();
  const { vaultItems, passwordEntries, intruderEvents, securityEvents } = useDataStore();

  if (!profile) return null;

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <PageHeader title="Profile" subtitle="Your account information and security status" />

      <Card className="mb-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl gradient-accent flex items-center justify-center text-3xl font-bold text-white shadow-glow">
            {profile.display_name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white">{profile.display_name}</h2>
            <p className="text-sm text-muted truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              {profile.face_registered ? <Badge color="#22C55E"><ScanFace className="w-3 h-3" /> Face Registered</Badge> : <Badge color="#F59E0B"><ScanFace className="w-3 h-3" /> Face Not Registered</Badge>}
              <Badge color="#00E5FF"><Shield className="w-3 h-3" /> Active</Badge>
            </div>
          </div>
          <Button variant="secondary" size="sm" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => navigate("/app/settings")}>Edit</Button>
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-white mb-4">Account Details</h3>
        <div className="space-y-3">
          <InfoRow icon={<User className="w-4 h-4" />} label="Full Name" value={profile.display_name} />
          <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={user?.email ?? "—"} />
          <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={profile.phone ?? "Not set"} />
          <InfoRow icon={<Calendar className="w-4 h-4" />} label="Member Since" value={format(new Date(profile.created_at), "MMM d, yyyy")} />
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-white mb-4">Security Summary</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Vault Items" value={vaultItems.length} icon={<Shield className="w-4 h-4" />} color="#00E5FF" />
          <StatCard label="Passwords" value={passwordEntries.length} icon={<KeyRound className="w-4 h-4" />} color="#22C55E" />
          <StatCard label="Intruder Events" value={intruderEvents.length} icon={<Bell className="w-4 h-4" />} color="#EF4444" />
          <StatCard label="Security Events" value={securityEvents.length} icon={<Shield className="w-4 h-4" />} color="#F59E0B" />
        </div>
      </Card>

      {profile.emergency_contact_name && (
        <Card>
          <h3 className="text-sm font-semibold text-white mb-3">Emergency Contact</h3>
          <div className="space-y-2">
            <InfoRow icon={<User className="w-4 h-4" />} label="Name" value={profile.emergency_contact_name} />
            {profile.emergency_contact_email && <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={profile.emergency_contact_email} />}
            {profile.emergency_contact_phone && <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={profile.emergency_contact_phone} />}
          </div>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-base-surface">
      <div className="text-muted flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0"><p className="text-xs text-muted uppercase tracking-wider">{label}</p><p className="text-sm text-white truncate">{value}</p></div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-base-surface rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1"><div style={{ color }}>{icon}</div><span className="text-xs text-muted">{label}</span></div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}
