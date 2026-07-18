import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Plus, Search, Eye, EyeOff, Copy, Trash2, Star, RefreshCw, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, Globe, Wifi, Landmark, Hash, Smartphone, StickyNote, Lock, X, Zap } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import {
  createPasswordEntry, updatePasswordEntry, deletePasswordEntry, detectDuplicates,
} from "@/lib/vaultService";
import {
  isVaultUnlocked, unlockVault, decryptField, passwordStrength, generatePassword,
} from "@/lib/crypto";
import { logSecurityEvent, getDeviceInfo } from "@/lib/securityService";
import { PASSWORD_TYPE_META } from "@/types";
import type { PasswordEntry, PasswordEntryType } from "@/types";
import { Card, Button, Badge, Modal, EmptyState, Spinner, ProgressRing } from "@/components/ui";
import { PageHeader } from "@/components/layout/PageHeader";

const iconMap: Record<string, typeof Globe> = {
  Globe, Wifi, Landmark, Hash, Smartphone, StickyNote, KeyRound,
};

export default function PasswordManagerPage() {
  const { user } = useAuthStore();
  const { passwordEntries, loadAll } = useDataStore();
  const [unlocked, setUnlocked] = useState(isVaultUnlocked());
  const [pin, setPin] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "weak" | "duplicate" | "favorite">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<PasswordEntry | null>(null);
  const [decrypted, setDecrypted] = useState<Record<string, string | null>>({});
  const [showPwd, setShowPwd] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [genLength, setGenLength] = useState(16);
  const [genOpts, setGenOpts] = useState({ upper: true, lower: true, numbers: true, symbols: true });

  const duplicateIds = useMemo(() => detectDuplicates(passwordEntries), [passwordEntries]);

  const filtered = useMemo(() => {
    let result = passwordEntries;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        (p.username ?? "").toLowerCase().includes(q) ||
        (p.website ?? "").toLowerCase().includes(q) ||
        (p.url ?? "").toLowerCase().includes(q)
      );
    }
    if (filter === "weak") result = result.filter((p) => p.is_weak);
    else if (filter === "duplicate") result = result.filter((p) => duplicateIds.has(p.id));
    else if (filter === "favorite") result = result.filter((p) => p.is_favorite);
    return result;
  }, [passwordEntries, search, filter, duplicateIds]);

  const weakCount = passwordEntries.filter((p) => p.is_weak).length;
  const dupCount = passwordEntries.filter((p) => duplicateIds.has(p.id)).length;
  const avgStrength = passwordEntries.length > 0
    ? Math.round(passwordEntries.reduce((a, p) => a + p.strength_score, 0) / passwordEntries.length)
    : 0;

  const handleUnlock = async () => {
    setLoading(true);
    try { await unlockVault(pin); setUnlocked(true); } catch { /* */ }
    setLoading(false);
  };

  const handleSelect = async (entry: PasswordEntry) => {
    setSelected(entry);
    if (isVaultUnlocked()) {
      const pwd = await decryptField(entry.password);
      const notes = await decryptField(entry.notes);
      setDecrypted({ password: pwd, notes });
      if (user) logSecurityEvent({ user_id: user.id, type: "password_viewed", severity: "info", title: "Password Viewed", description: `Viewed: ${entry.title}`, device_info: getDeviceInfo() });
    }
  };

  const copy = (text: string) => navigator.clipboard.writeText(text);

  const handleDelete = async (entry: PasswordEntry) => {
    await deletePasswordEntry(entry.id);
    if (user) logSecurityEvent({ user_id: user.id, type: "vault_item_deleted", severity: "medium", title: "Password Deleted", description: `Deleted: ${entry.title}` });
    setSelected(null);
  };

  const handleGenPassword = () => generatePassword(genLength, genOpts);

  if (!unlocked) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <Card className="mt-8">
          <div className="text-center mb-6">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-accent-soft items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-xl font-bold text-white">Password Manager Locked</h2>
            <p className="text-sm text-muted mt-1">Enter your PIN to access passwords</p>
          </div>
          <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleUnlock()} placeholder="Enter PIN" className="w-full bg-base-surface border border-base-border rounded-xl px-4 py-2.5 text-sm text-white text-center tracking-widest focus:outline-none focus:border-accent" autoFocus />
          <Button onClick={handleUnlock} className="w-full mt-3" loading={loading}>Unlock</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader title="Password Manager" subtitle="AI-powered password health monitoring and secure storage" action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add Password</Button>} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card><div className="flex items-center gap-3"><ProgressRing value={avgStrength} size={56} stroke={5} color={avgStrength >= 70 ? "#22C55E" : avgStrength >= 40 ? "#F59E0B" : "#EF4444"} /><div><p className="text-xs text-muted">Avg Strength</p><p className="text-lg font-bold text-white">{avgStrength}%</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><div className="w-14 h-14 rounded-xl bg-base-surface flex items-center justify-center"><KeyRound className="w-6 h-6 text-accent" /></div><div><p className="text-xs text-muted">Total</p><p className="text-lg font-bold text-white">{passwordEntries.length}</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: weakCount > 0 ? "#EF444422" : "#22C55E22" }}><AlertTriangle className="w-6 h-6" style={{ color: weakCount > 0 ? "#EF4444" : "#22C55E" }} /></div><div><p className="text-xs text-muted">Weak</p><p className="text-lg font-bold text-white">{weakCount}</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: dupCount > 0 ? "#F59E0B22" : "#22C55E22" }}><Copy className="w-6 h-6" style={{ color: dupCount > 0 ? "#F59E0B" : "#22C55E" }} /></div><div><p className="text-xs text-muted">Duplicates</p><p className="text-lg font-bold text-white">{dupCount}</p></div></div></Card>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search passwords..." className="w-full bg-base-surface border border-base-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-muted-faint focus:outline-none focus:border-accent" />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {([["all", "All"], ["weak", "Weak"], ["duplicate", "Duplicates"], ["favorite", "Favorites"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filter === key ? "bg-accent-soft text-accent border border-accent/30" : "bg-base-surface text-muted-light border border-base-border hover:bg-base-elevated"}`}>{label}</button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon={<KeyRound className="w-12 h-12" />} title="No passwords found" message="Add your first password to get started with AI-powered password health monitoring." action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add Password</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((entry, i) => {
            const meta = PASSWORD_TYPE_META[entry.entry_type];
            const Icon = iconMap[meta.icon] ?? KeyRound;
            return (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="cursor-pointer hover:border-accent/30 transition-all" >
                  <div onClick={() => handleSelect(entry)}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${meta.color}22` }}>
                        <Icon className="w-5 h-5" style={{ color: meta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{entry.title}</p>
                        <p className="text-xs text-muted truncate">{entry.username ?? entry.website ?? ""}</p>
                      </div>
                      {entry.is_favorite && <Star className="w-4 h-4 text-warning flex-shrink-0" fill="#F59E0B" />}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge color={entry.strength_score >= 70 ? "#22C55E" : entry.strength_score >= 40 ? "#F59E0B" : "#EF4444"}>{entry.strength_score >= 70 ? "Strong" : entry.strength_score >= 40 ? "Fair" : "Weak"}</Badge>
                      {entry.is_weak && <Badge color="#EF4444">Weak</Badge>}
                      {duplicateIds.has(entry.id) && <Badge color="#F59E0B">Duplicate</Badge>}
                      <Badge color={meta.color}>{meta.label}</Badge>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => { setSelected(null); setDecrypted({}); setShowPwd({}); }} title={selected?.title} size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge color={PASSWORD_TYPE_META[selected.entry_type].color}>{PASSWORD_TYPE_META[selected.entry_type].label}</Badge>
              <Badge color={selected.strength_score >= 70 ? "#22C55E" : selected.strength_score >= 40 ? "#F59E0B" : "#EF4444"}>Strength: {selected.strength_score}%</Badge>
              {selected.is_weak && <Badge color="#EF4444">Weak</Badge>}
              {duplicateIds.has(selected.id) && <Badge color="#F59E0B">Duplicate</Badge>}
            </div>
            {selected.username && <DetailRow label="Username" value={selected.username} onCopy={() => copy(selected.username!)} />}
            {decrypted.password && <DetailRow label="Password" value={decrypted.password} masked show={showPwd.password} onToggle={() => setShowPwd((p) => ({ ...p, password: !p.password }))} onCopy={() => copy(decrypted.password!)} />}
            {selected.url && <DetailRow label="URL" value={selected.url} onCopy={() => copy(selected.url!)} />}
            {selected.website && <DetailRow label="Website" value={selected.website} onCopy={() => copy(selected.website!)} />}
            {decrypted.notes && <div><p className="text-xs text-muted uppercase tracking-wider mb-1">Notes</p><p className="text-sm text-white whitespace-pre-wrap p-3 bg-base-surface rounded-xl">{decrypted.notes}</p></div>}
            {selected.strength_score < 70 && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-warning-soft border border-warning/20">
                <Zap className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-light">This password is {selected.strength_score < 40 ? "weak" : "moderate"}. Consider updating it with a stronger alternative using the built-in generator.</p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="danger" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => handleDelete(selected)} className="flex-1">Delete</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Modal */}
      <AddPasswordModal open={addOpen} onClose={() => setAddOpen(false)} userId={user?.id ?? ""} onSaved={() => { if (user) loadAll(user.id); }} genLength={genLength} setGenLength={setGenLength} genOpts={genOpts} setGenOpts={setGenOpts} onGenPassword={handleGenPassword} />
    </div>
  );
}

function DetailRow({ label, value, masked, show, onToggle, onCopy }: {
  label: string; value: string; masked?: boolean; show?: boolean; onToggle?: () => void; onCopy?: () => void;
}) {
  const display = masked && !show ? "••••••••••••" : value;
  return (
    <div className="flex items-center justify-between bg-base-surface rounded-xl p-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm text-white font-mono truncate">{display}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {masked && <button onClick={onToggle} className="text-muted hover:text-white p-1.5">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
        <button onClick={onCopy} className="text-muted hover:text-white p-1.5"><Copy className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function AddPasswordModal({ open, onClose, userId, onSaved, genLength, setGenLength, genOpts, setGenOpts, onGenPassword }: {
  open: boolean; onClose: () => void; userId: string; onSaved: () => void;
  genLength: number; setGenLength: (n: number) => void;
  genOpts: { upper: boolean; lower: boolean; numbers: boolean; symbols: boolean };
  setGenOpts: (o: { upper: boolean; lower: boolean; numbers: boolean; symbols: boolean }) => void;
  onGenPassword: () => string;
}) {
  const [type, setType] = useState<PasswordEntryType>("website");
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [showGen, setShowGen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const strength = password ? passwordStrength(password) : null;

  const handleSave = async () => {
    if (!title || !userId) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    try {
      await createPasswordEntry(userId, { entry_type: type, title, username: username || null, password: password || null, url: url || null, notes: notes || null });
      logSecurityEvent({ user_id: userId, type: "password_added", severity: "info", title: "Password Added", description: `Added: ${title}` });
      onSaved();
      handleClose();
    } catch (e) { setError((e as Error).message); }
    setSaving(false);
  };

  const handleClose = () => {
    setType("website"); setTitle(""); setUsername(""); setPassword(""); setUrl(""); setNotes(""); setShowGen(false); setError("");
    onClose();
  };

  const handleGen = () => {
    const pwd = onGenPassword();
    setPassword(pwd);
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add Password" size="md">
      <div className="space-y-4">
        {error && <div className="text-sm text-danger bg-danger-soft p-3 rounded-lg">{error}</div>}
        <div>
          <label className="block text-xs font-medium text-muted-light mb-1.5">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as PasswordEntryType)} className="w-full bg-base-surface border border-base-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent">
            {Object.entries(PASSWORD_TYPE_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
          </select>
        </div>
        <div><label className="block text-xs font-medium text-muted-light mb-1.5">Title *</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Gmail, Bank Account" className="w-full bg-base-surface border border-base-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent" /></div>
        <div><label className="block text-xs font-medium text-muted-light mb-1.5">Username / Email</label><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username@example.com" className="w-full bg-base-surface border border-base-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent" /></div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-muted-light">Password</label>
            <button onClick={() => setShowGen(!showGen)} className="text-xs text-accent hover:underline flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Generate</button>
          </div>
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter or generate password" className="w-full bg-base-surface border border-base-border rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-accent" />
          {strength && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-base-border overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${strength.score}%`, background: strength.color }} /></div>
              <span className="text-xs font-medium" style={{ color: strength.color }}>{strength.label}</span>
            </div>
          )}
          {showGen && (
            <div className="mt-3 p-3 bg-base-surface rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted">Length: {genLength}</label>
                <input type="range" min="8" max="32" value={genLength} onChange={(e) => setGenLength(Number(e.target.value))} className="flex-1" />
              </div>
              <div className="flex gap-3 flex-wrap">
                {([["upper", "A-Z"], ["lower", "a-z"], ["numbers", "0-9"], ["symbols", "!@#"]] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1.5 text-xs text-muted-light cursor-pointer">
                    <input type="checkbox" checked={genOpts[key]} onChange={(e) => setGenOpts({ ...genOpts, [key]: e.target.checked })} className="accent-accent" />
                    {label}
                  </label>
                ))}
              </div>
              <Button size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={handleGen} className="w-full">Generate Password</Button>
            </div>
          )}
        </div>
        <div><label className="block text-xs font-medium text-muted-light mb-1.5">URL</label><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className="w-full bg-base-surface border border-base-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent" /></div>
        <div><label className="block text-xs font-medium text-muted-light mb-1.5">Notes (encrypted)</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional secure notes" rows={2} className="w-full bg-base-surface border border-base-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent resize-none" /></div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} loading={saving} className="flex-1">Save Password</Button>
        </div>
      </div>
    </Modal>
  );
}
