import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Lock, Star, Trash2, Eye, EyeOff, Copy, Clock,
  Tag, FileText, CreditCard, StickyNote, Calendar, Shield,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import { decryptField, isVaultUnlocked, unlockVault } from "@/lib/crypto";
import { touchVaultItem, deleteVaultItem } from "@/lib/vaultService";
import { logSecurityEvent, getDeviceInfo } from "@/lib/securityService";
import { CATEGORY_META } from "@/types";
import type { VaultItem } from "@/types";
import { Card, Button, Badge, Modal, EmptyState, Spinner } from "@/components/ui";

export default function VaultItemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const vaultItems = useDataStore((s) => s.vaultItems);
  const [item, setItem] = useState<VaultItem | null>(null);
  const [unlocked, setUnlocked] = useState(isVaultUnlocked());
  const [pin, setPin] = useState("");
  const [decrypted, setDecrypted] = useState<Record<string, string | null>>({});
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const found = vaultItems.find((v) => v.id === id);
    setItem(found ?? null);
    if (found) touchVaultItem(found.id);
  }, [id, vaultItems]);

  useEffect(() => {
    if (item && isVaultUnlocked()) {
      (async () => {
        const fields: Record<string, string | null> = {};
        if (item.card_number) fields.card_number = await decryptField(item.card_number);
        if (item.card_cvv) fields.card_cvv = await decryptField(item.card_cvv);
        if (item.card_expiry) fields.card_expiry = await decryptField(item.card_expiry);
        if (item.note_text) fields.note_text = await decryptField(item.note_text);
        setDecrypted(fields);
        if (user) {
          logSecurityEvent({
            user_id: user.id, type: "vault_item_viewed", severity: "info",
            title: "Vault Item Viewed", description: `Viewed: ${item.title}`,
            device_info: getDeviceInfo(),
          });
        }
      })();
    }
  }, [item, user]);

  const handleUnlock = async () => {
    setLoading(true);
    try {
      await unlockVault(pin);
      setUnlocked(true);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!item || !user) return;
    await deleteVaultItem(item.id);
    logSecurityEvent({
      user_id: user.id, type: "vault_item_deleted", severity: "medium",
      title: "Vault Item Deleted", description: `Deleted: ${item.title}`,
    });
    navigate("/app/vault");
  };

  if (!item) {
    return (
      <div className="p-6">
        <EmptyState icon={<FileText className="w-12 h-12" />} title="Item not found" message="This vault item may have been deleted." action={<Button onClick={() => navigate("/app/vault")}>Back to Vault</Button>} />
      </div>
    );
  }

  const meta = CATEGORY_META[item.category];

  if (!unlocked) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <Card className="mt-8">
          <div className="text-center mb-6">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-accent-soft items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-xl font-bold text-white">Vault Locked</h2>
            <p className="text-sm text-muted mt-1">Enter your PIN to decrypt this item</p>
          </div>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            placeholder="Enter PIN"
            className="w-full bg-base-surface border border-base-border rounded-xl px-4 py-2.5 text-sm text-white text-center tracking-widest focus:outline-none focus:border-accent"
            autoFocus
          />
          <Button onClick={handleUnlock} className="w-full mt-3" loading={loading}>Unlock</Button>
        </Card>
      </div>
    );
  }

  const toggleShow = (field: string) => setShowSensitive((prev) => ({ ...prev, [field]: !prev[field] }));
  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate("/app/vault")} className="flex items-center gap-2 text-sm text-muted hover:text-white mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Vault
      </button>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="mb-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}44` }}>
              {item.category === "card" ? <CreditCard className="w-8 h-8" style={{ color: meta.color }} /> :
               item.category === "note" ? <StickyNote className="w-8 h-8" style={{ color: meta.color }} /> :
               <FileText className="w-8 h-8" style={{ color: meta.color }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white truncate">{item.title}</h1>
                {item.is_favorite && <Star className="w-4 h-4 text-warning" fill="#F59E0B" />}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge color={meta.color}>{meta.label}</Badge>
                {item.expires_at && <Badge color="#F59E0B"><Calendar className="w-3 h-3" /> Expires</Badge>}
              </div>
            </div>
            <Button variant="danger" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => setDeleteOpen(true)}>Delete</Button>
          </div>
        </Card>

        {/* Encrypted fields */}
        <div className="space-y-3">
          {item.category === "card" && (
            <>
              <DecryptedField label="Card Number" value={decrypted.card_number} masked show={showSensitive.card_number} onToggle={() => toggleShow("card_number")} onCopy={() => decrypted.card_number && copyToClipboard(decrypted.card_number)} />
              <DecryptedField label="Expiry" value={decrypted.card_expiry} show={true} onCopy={() => decrypted.card_expiry && copyToClipboard(decrypted.card_expiry)} />
              <DecryptedField label="CVV" value={decrypted.card_cvv} masked show={showSensitive.card_cvv} onToggle={() => toggleShow("card_cvv")} onCopy={() => decrypted.card_cvv && copyToClipboard(decrypted.card_cvv)} />
              {item.card_holder && <StaticField label="Card Holder" value={item.card_holder} />}
              {item.card_type && <StaticField label="Card Type" value={item.card_type} />}
            </>
          )}
          {item.category === "note" && decrypted.note_text && (
            <Card>
              <p className="text-xs text-muted mb-2 uppercase tracking-wider">Note Content</p>
              <p className="text-sm text-white whitespace-pre-wrap">{decrypted.note_text}</p>
            </Card>
          )}
          {item.file_name && <StaticField label="File Name" value={item.file_name} />}
          {item.file_size_bytes != null && <StaticField label="File Size" value={`${(item.file_size_bytes / 1024).toFixed(1)} KB`} />}
          {item.tags.length > 0 && (
            <Card>
              <p className="text-xs text-muted mb-2 uppercase tracking-wider flex items-center gap-1"><Tag className="w-3 h-3" /> Tags</p>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => <Badge key={tag} color="#00E5FF">{tag}</Badge>)}
              </div>
            </Card>
          )}
          <Card>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Created</p>
                <p className="text-white flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-muted" />{new Date(item.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Last Updated</p>
                <p className="text-white flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-muted" />{new Date(item.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
          </Card>
          <Card className="flex items-center gap-3 border-accent/20">
            <Shield className="w-5 h-5 text-accent" />
            <p className="text-xs text-muted">This item is protected with AES-256 encryption. Sensitive fields are decrypted only when you view them.</p>
          </Card>
        </div>
      </motion.div>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Item" size="sm">
        <p className="text-sm text-muted mb-4">Are you sure you want to delete "{item.title}"? This action cannot be undone.</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1">Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

function DecryptedField({ label, value, masked, show, onToggle, onCopy }: {
  label: string; value: string | null | undefined; masked?: boolean; show?: boolean; onToggle?: () => void; onCopy?: () => void;
}) {
  const display = masked && !show ? "••••••••••••" : value ?? "—";
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">{label}</p>
          <p className="text-sm text-white font-mono truncate">{display}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {masked && <button onClick={onToggle} className="text-muted hover:text-white p-1">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
          {value && <button onClick={onCopy} className="text-muted hover:text-white p-1"><Copy className="w-4 h-4" /></button>}
        </div>
      </div>
    </Card>
  );
}

function StaticField({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </Card>
  );
}
