import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Star, Trash2, Lock, Clock as Unlock, FolderPlus, Folder, LayoutGrid, List as ListIcon, Eye, EyeOff, Tag, Shield, TriangleAlert as AlertTriangle, ChevronDown, Calendar, Sparkles, KeyRound, FileText, BookMarked, CreditCard, IdCard, Car, HeartPulse, Award, StickyNote, Image as ImageIcon, Video, Upload, X as XIcon, Paperclip } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import {
  createVaultItem, updateVaultItem, deleteVaultItem, createFolder, deleteFolder,
  touchVaultItem,
} from "@/lib/vaultService";
import { isVaultUnlocked, unlockVault, encryptFields, decryptField } from "@/lib/crypto";
import { logSecurityEvent, getDeviceInfo } from "@/lib/securityService";
import type { VaultItem, VaultCategory, VaultCategoryGroup } from "@/types";
import { CATEGORY_META } from "@/types";
import { Card, Button, Badge, Modal, Input, EmptyState, Spinner } from "@/components/ui";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatDistanceToNow } from "date-fns";

// ─── Icon map: CATEGORY_META.icon strings → lucide components ──────────────
const iconMap: Record<string, typeof Shield> = {
  FileText, BookMarked, CreditCard, IdCard, Car, HeartPulse, Award,
  StickyNote, KeyRound, Lock, Image: ImageIcon, Video,
};

function getIcon(name: string) {
  return iconMap[name] ?? FileText;
}

// ─── Group metadata ──────────────────────────────────────────────────────────
const GROUPS: { id: VaultCategoryGroup; label: string; icon: typeof Shield }[] = [
  { id: "all", label: "All Items", icon: LayoutGrid },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "identity", label: "Identity", icon: Shield },
  { id: "financial", label: "Financial", icon: CreditCard },
  { id: "personal", label: "Personal", icon: HeartPulse },
  { id: "other", label: "Other", icon: KeyRound },
  { id: "favorites", label: "Favorites", icon: Star },
];

const CARD_TYPES = ["Visa", "Mastercard", "Amex", "Discover", "RuPay", "Other"];

// ─── Component ───────────────────────────────────────────────────────────────
export default function VaultPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { vaultItems, vaultFolders, loading } = useDataStore();
  const userId = user?.id ?? "";

  const [unlocked, setUnlocked] = useState(isVaultUnlocked());
  const [pin, setPin] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const [activeGroup, setActiveGroup] = useState<VaultCategoryGroup>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const [showAdd, setShowAdd] = useState(false);
  const [showFolder, setShowFolder] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VaultItem | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [decryptedCards, setDecryptedCards] = useState<Record<string, string>>({});

  // ─── Vault unlock ──────────────────────────────────────────────────────────
  const handleUnlock = async () => {
    if (pin.length < 4) {
      setUnlockError("PIN must be at least 4 digits.");
      return;
    }
    setUnlocking(true);
    setUnlockError("");
    try {
      const ok = await unlockVault(pin);
      if (ok) {
        setUnlocked(true);
        setPin("");
        if (userId) {
          void logSecurityEvent({
            user_id: userId,
            type: "login_success",
            severity: "info",
            title: "Vault unlocked",
            description: "Vault unlocked with PIN.",
            metadata: { source: "vault" },
            device_info: getDeviceInfo(),
          });
        }
      }
    } catch {
      setUnlockError("Failed to unlock vault. Please try again.");
    } finally {
      setUnlocking(false);
    }
  };

  // ─── Filtered items ────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vaultItems.filter((item) => {
      if (activeGroup === "favorites" && !item.is_favorite) return false;
      if (activeGroup !== "all" && activeGroup !== "favorites") {
        const cat = CATEGORY_META[item.category];
        if (cat.group !== activeGroup) return false;
      }
      if (q) {
        const inTitle = item.title.toLowerCase().includes(q);
        const inTags = item.tags.some((t) => t.toLowerCase().includes(q));
        const inCat = CATEGORY_META[item.category].label.toLowerCase().includes(q);
        if (!inTitle && !inTags && !inCat) return false;
      }
      return true;
    });
  }, [vaultItems, activeGroup, query]);

  // ─── Group counts ──────────────────────────────────────────────────────────
  const groupCounts = useMemo(() => {
    const counts: Record<VaultCategoryGroup, number> = {
      all: vaultItems.length, documents: 0, identity: 0, financial: 0,
      personal: 0, other: 0, favorites: 0,
    };
    for (const item of vaultItems) {
      const group = CATEGORY_META[item.category].group;
      counts[group] += 1;
      if (item.is_favorite) counts.favorites += 1;
    }
    return counts;
  }, [vaultItems]);

  // ─── Favorite toggle ───────────────────────────────────────────────────────
  const toggleFavorite = async (item: VaultItem) => {
    try {
      const updated = await updateVaultItem(item.id, { is_favorite: !item.is_favorite });
      useDataStore.setState((s) => ({
        vaultItems: s.vaultItems.map((v) => (v.id === updated.id ? updated : v)),
      }));
    } catch {
      /* swallow: optimistic UI not required */
    }
  };

  // ─── Delete item ───────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await deleteVaultItem(deleteTarget.id);
      useDataStore.setState((s) => ({ vaultItems: s.vaultItems.filter((v) => v.id !== deleteTarget.id) }));
      if (userId) {
        void logSecurityEvent({
          user_id: userId,
          type: "vault_item_deleted",
          severity: "medium",
          title: "Vault item deleted",
          description: `"${deleteTarget.title}" was deleted from the vault.`,
          metadata: { item_id: deleteTarget.id, category: deleteTarget.category },
          device_info: getDeviceInfo(),
        });
      }
      setDeleteTarget(null);
    } catch {
      /* ignore */
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Open item ─────────────────────────────────────────────────────────────
  const openItem = (item: VaultItem) => {
    void touchVaultItem(item.id);
    if (userId) {
      void logSecurityEvent({
        user_id: userId,
        type: "vault_item_viewed",
        severity: "info",
        title: "Vault item viewed",
        description: `"${item.title}" was opened in the vault.`,
        metadata: { item_id: item.id, category: item.category },
        device_info: getDeviceInfo(),
      });
    }
    navigate(`/app/vault/${item.id}`);
  };

  // ─── Decrypt card previews for list view ───────────────────────────────────
  useEffect(() => {
    if (!unlocked) return;
    const cards = filteredItems.filter((i) => i.category === "card" && i.card_number);
    if (cards.length === 0) return;
    let cancelled = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const c of cards) {
        if (cancelled) return;
        const dec = await decryptField(c.card_number);
        out[c.id] = dec ?? "";
      }
      if (!cancelled) setDecryptedCards(out);
    })();
    return () => { cancelled = true; };
  }, [filteredItems, unlocked]);

  // ─── Locked screen ─────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <PageHeader title="Secure Vault" subtitle="Enter your PIN to unlock your encrypted items" />
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }} className="max-w-md mx-auto mt-12"
        >
          <Card className="text-center" glow>
            <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-5 shadow-glow">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Vault Locked</h2>
            <p className="text-sm text-muted mb-6">
              Your items are protected with AES-256 encryption. Enter your PIN to decrypt and access them.
            </p>
            <div className="space-y-3">
              <Input
                type="password"
                inputMode="numeric"
                placeholder="••••••"
                value={pin}
                onChange={(e) => { setPin(e.target.value); setUnlockError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") void handleUnlock(); }}
                error={unlockError}
                icon={<KeyRound className="w-4 h-4" />}
                autoFocus
                className="text-center tracking-[0.5em] text-lg"
              />
              <Button onClick={handleUnlock} loading={unlocking} size="lg" className="w-full" icon={<Unlock className="w-4 h-4" />}>
                Unlock Vault
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Secure Vault"
        subtitle="Your encrypted documents, identity & credentials"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" icon={<FolderPlus className="w-4 h-4" />} onClick={() => setShowFolder(true)}>
              New Folder
            </Button>
            <Button size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
              Add Item
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar: groups + folders */}
        <aside className="space-y-4">
          <Card className="p-3">
            <nav className="space-y-1">
              {GROUPS.map((g) => {
                const active = activeGroup === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setActiveGroup(g.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                      active ? "bg-accent-soft text-accent border border-accent/30" : "text-muted-light hover:text-white hover:bg-base-elevated"
                    }`}
                  >
                    <g.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{g.label}</span>
                    <span className={`text-xs ${active ? "text-accent" : "text-muted-faint"}`}>{groupCounts[g.id]}</span>
                  </button>
                );
              })}
            </nav>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between px-2 mb-2">
              <h3 className="text-xs font-semibold text-muted-light uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5" /> Folders
              </h3>
              <button onClick={() => setShowFolder(true)} className="text-muted hover:text-accent transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {vaultFolders.length === 0 ? (
              <p className="text-xs text-muted px-2 py-3">No folders yet.</p>
            ) : (
              <div className="space-y-1">
                {vaultFolders.map((f) => (
                  <div key={f.id} className="group flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-base-elevated transition-all">
                    <Folder className="w-4 h-4 flex-shrink-0" style={{ color: f.color }} />
                    <span className="flex-1 text-sm text-muted-light truncate">{f.name}</span>
                    <button
                      onClick={() => setDeleteFolderTarget(f.id)}
                      className="text-muted-faint opacity-0 group-hover:opacity-100 hover:text-danger transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Encrypted at rest</p>
                <p className="text-xs text-muted mt-0.5">AES-256-GCM. Keys derived from your PIN.</p>
              </div>
            </div>
          </Card>
        </aside>

        {/* Main: search + items */}
        <section>
          {/* Search + view toggle */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Input
              placeholder="Search by title, tag or category…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
              className="flex-1"
            />
            <div className="flex items-center gap-1 glass rounded-xl p-1">
              <button
                onClick={() => setView("grid")}
                className={`p-2 rounded-lg transition-all ${view === "grid" ? "bg-accent-soft text-accent" : "text-muted hover:text-white"}`}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`p-2 rounded-lg transition-all ${view === "list" ? "bg-accent-soft text-accent" : "text-muted hover:text-white"}`}
                aria-label="List view"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex justify-center py-24"><Spinner size={36} /></div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={<Lock className="w-12 h-12" />}
              title={query || activeGroup !== "all" ? "No items found" : "Your vault is empty"}
              message={
                query || activeGroup !== "all"
                  ? "Try adjusting your search or selecting a different category."
                  : "Securely store documents, cards, IDs and notes — all encrypted on-device."
              }
              action={
                <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
                  Add your first item
                </Button>
              }
            />
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item) => (
                  <VaultCard
                    key={item.id}
                    item={item}
                    onClick={() => openItem(item)}
                    onFavorite={() => toggleFavorite(item)}
                    onDelete={() => setDeleteTarget(item)}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item) => (
                  <VaultRow
                    key={item.id}
                    item={item}
                    decryptedNumber={decryptedCards[item.id]}
                    onClick={() => openItem(item)}
                    onFavorite={() => toggleFavorite(item)}
                    onDelete={() => setDeleteTarget(item)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>

      {/* ─── Add item modal ─────────────────────────────────────────────────── */}
      <AddItemModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        folders={vaultFolders}
        onSave={async (payload) => {
          if (!userId) return;
          const newItem = await createVaultItem(userId, payload);
          // Optimistically add to store so UI updates instantly
          useDataStore.setState((s) => ({ vaultItems: [newItem, ...s.vaultItems] }));
          if (userId) {
            void logSecurityEvent({
              user_id: userId,
              type: "vault_item_added",
              severity: "info",
              title: "Vault item added",
              description: `"${payload.title}" (${CATEGORY_META[payload.category].label}) added to the vault.`,
              metadata: { category: payload.category },
              device_info: getDeviceInfo(),
            });
          }
        }}
      />

      {/* ─── Folder modal ───────────────────────────────────────────────────── */}
      <FolderModal
        open={showFolder}
        onClose={() => setShowFolder(false)}
        onCreate={async (name, color) => {
          if (!userId) return;
          const newFolder = await createFolder(userId, name, "folder", color, null);
          // Optimistically add to store so UI updates instantly
          useDataStore.setState((s) => ({ vaultFolders: [...s.vaultFolders, newFolder].sort((a, b) => a.name.localeCompare(b.name)) }));
          if (userId) {
            void logSecurityEvent({
              user_id: userId,
              type: "folder_created",
              severity: "info",
              title: "Folder created",
              description: `Folder "${name}" created in the vault.`,
              metadata: { name },
              device_info: getDeviceInfo(),
            });
          }
        }}
      />

      {/* ─── Delete confirmations ───────────────────────────────────────────── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete item" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-danger-soft flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-danger" />
            </div>
            <div>
              <p className="text-sm text-white">Delete <span className="font-semibold">"{deleteTarget?.title}"</span>?</p>
              <p className="text-xs text-muted mt-1">This item will be permanently removed. This action cannot be undone.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={actionLoading} onClick={handleDelete} icon={<Trash2 className="w-4 h-4" />}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteFolderTarget} onClose={() => setDeleteFolderTarget(null)} title="Delete folder" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted">Delete this folder? Items inside will remain in the vault but unassigned.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteFolderTarget(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={actionLoading}
              onClick={async () => {
                if (!deleteFolderTarget) return;
                setActionLoading(true);
                try {
                  await deleteFolder(deleteFolderTarget);
                  useDataStore.setState((s) => ({ vaultFolders: s.vaultFolders.filter((f) => f.id !== deleteFolderTarget) }));
                  setDeleteFolderTarget(null);
                } catch { /* ignore */ } finally { setActionLoading(false); }
              }}
              icon={<Trash2 className="w-4 h-4" />}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Vault card (grid) ───────────────────────────────────────────────────────
function VaultCard({
  item, onClick, onFavorite, onDelete,
}: {
  item: VaultItem; onClick: () => void; onFavorite: () => void; onDelete: () => void;
}) {
  const meta = CATEGORY_META[item.category];
  const Icon = getIcon(meta.icon);
  const isExpiringSoon = useMemo(() => isExpiringSoonFn(item.expires_at), [item.expires_at]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group relative cursor-pointer hover:border-accent/40 transition-all h-full" >
        <button onClick={onClick} className="absolute inset-0 rounded-2xl" aria-label={`Open ${item.title}`} />
        {/* Favorite */}
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite(); }}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg hover:bg-base-elevated transition-all"
          aria-label="Toggle favorite"
        >
          <Star
            className="w-4 h-4 transition-all"
            style={{ color: item.is_favorite ? "#F59E0B" : "#64748B" }}
            fill={item.is_favorite ? "#F59E0B" : "none"}
          />
        </button>

        <div className="relative flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${meta.color}22` }}>
            <Icon className="w-5 h-5" style={{ color: meta.color }} />
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <p className="text-sm font-semibold text-white truncate">{item.title}</p>
            <p className="text-xs text-muted mt-0.5">{meta.label}</p>
          </div>
        </div>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3 relative">
            {item.tags.slice(0, 3).map((t) => (
              <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-base-elevated text-muted-light">
                <Tag className="w-2.5 h-2.5" /> {t}
              </span>
            ))}
            {item.tags.length > 3 && <span className="text-[10px] text-muted">+{item.tags.length - 3}</span>}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-2">
            {isExpiringSoon && (
              <Badge color="#F59E0B"><AlertTriangle className="w-2.5 h-2.5" /> Expiring</Badge>
            )}
            {item.category === "card" && item.card_type && (
              <Badge color={meta.color}>{item.card_type}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-lg text-muted-faint opacity-0 group-hover:opacity-100 hover:text-danger hover:bg-base-elevated transition-all"
              aria-label="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Vault row (list) ────────────────────────────────────────────────────────
function VaultRow({
  item, decryptedNumber, onClick, onFavorite, onDelete,
}: {
  item: VaultItem; decryptedNumber?: string; onClick: () => void;
  onFavorite: () => void; onDelete: () => void;
}) {
  const meta = CATEGORY_META[item.category];
  const Icon = getIcon(meta.icon);
  const isExpiringSoon = useMemo(() => isExpiringSoonFn(item.expires_at), [item.expires_at]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group flex items-center gap-3 py-3 px-4 cursor-pointer hover:border-accent/40 transition-all">
        <button onClick={onClick} className="absolute inset-0 rounded-2xl" aria-label={`Open ${item.title}`} />
        <div className="relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${meta.color}22` }}>
          <Icon className="w-5 h-5" style={{ color: meta.color }} />
        </div>
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white truncate">{item.title}</p>
            {isExpiringSoon && <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />}
          </div>
          <p className="text-xs text-muted truncate">
            {meta.label}
            {item.category === "card" && decryptedNumber && ` • •••• ${decryptedNumber.slice(-4)}`}
          </p>
        </div>
        {item.tags.length > 0 && (
          <div className="relative hidden sm:flex items-center gap-1.5">
            {item.tags.slice(0, 2).map((t) => (
              <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-base-elevated text-muted-light">{t}</span>
            ))}
          </div>
        )}
        <div className="relative flex items-center gap-1">
          <span className="text-xs text-muted-faint hidden md:block">
            {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onFavorite(); }}
            className="p-1.5 rounded-lg hover:bg-base-elevated transition-all"
            aria-label="Toggle favorite"
          >
            <Star className="w-4 h-4" style={{ color: item.is_favorite ? "#F59E0B" : "#64748B" }} fill={item.is_favorite ? "#F59E0B" : "none"} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg text-muted-faint opacity-0 group-hover:opacity-100 hover:text-danger hover:bg-base-elevated transition-all"
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Add item modal ──────────────────────────────────────────────────────────
function AddItemModal({
  open, onClose, folders, onSave,
}: {
  open: boolean;
  onClose: () => void;
  folders: { id: string; name: string }[];
  onSave: (payload: {
    title: string; category: VaultCategory; folder_id: string | null;
    card_number: string | null; card_holder: string | null; card_expiry: string | null;
    card_cvv: string | null; card_type: string | null; note_text: string | null;
    file_name: string | null; file_data: string | null; file_mime_type: string | null;
    file_size_bytes: number | null; tags: string[]; is_favorite: boolean; expires_at: string | null;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<VaultCategory>("document");
  const [folderId, setFolderId] = useState<string>("");
  const [tags, setTags] = useState("");
  const [favorite, setFavorite] = useState(false);

  // card fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardType, setCardType] = useState("Visa");
  const [showCvv, setShowCvv] = useState(false);

  // note field
  const [noteText, setNoteText] = useState("");

  // file / generic fields
  const [fileName, setFileName] = useState("");
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setTitle(""); setCategory("document"); setFolderId(""); setTags(""); setFavorite(false);
      setCardNumber(""); setCardHolder(""); setCardExpiry(""); setCardCvv(""); setCardType("Visa"); setShowCvv(false);
      setNoteText(""); setFileName(""); setFileData(null); setFileMime(null); setFileSize(null);
      setExpiryDate(""); setError(""); setSaving(false);
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("File is too large. Maximum size is 10 MB."); return; }
    setFileName(file.name);
    setFileMime(file.type || "application/octet-stream");
    setFileSize(file.size);
    setError("");
    const reader = new FileReader();
    reader.onload = () => { setFileData(reader.result as string); };
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setFileName(""); setFileData(null); setFileMime(null); setFileSize(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isCard = category === "card";
  const isNote = category === "note";

  const handleSave = async () => {
    setError("");
    if (!title.trim()) { setError("Please enter a title."); return; }
    if (isCard) {
      if (!cardNumber.trim()) { setError("Please enter a card number."); return; }
      if (!cardHolder.trim()) { setError("Please enter the card holder name."); return; }
    }
    if (isNote && !noteText.trim()) { setError("Please enter note text."); return; }
    if (!isCard && !isNote && !fileData) { setError("Please choose a file to upload."); return; }

    setSaving(true);
    try {
      const tagsArr = tags.split(",").map((t) => t.trim()).filter(Boolean);
      await onSave({
        title: title.trim(),
        category,
        folder_id: folderId || null,
        card_number: isCard ? cardNumber.trim() : null,
        card_holder: isCard ? cardHolder.trim() : null,
        card_expiry: isCard ? cardExpiry.trim() : null,
        card_cvv: isCard ? cardCvv.trim() : null,
        card_type: isCard ? cardType : null,
        note_text: isNote ? noteText.trim() : null,
        file_name: !isCard && !isNote ? fileName : null,
        file_data: !isCard && !isNote ? fileData : null,
        file_mime_type: !isCard && !isNote ? fileMime : null,
        file_size_bytes: !isCard && !isNote ? fileSize : null,
        tags: tagsArr,
        is_favorite: favorite,
        expires_at: !isCard && expiryDate ? new Date(expiryDate).toISOString() : null,
      });
      onClose();
    } catch (e) {
      setError("Failed to save item. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Vault Item" size="lg">
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-danger-soft border border-danger/30">
            <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
            <p className="text-xs text-danger">{error}</p>
          </div>
        )}

        <Input label="Title" placeholder="e.g. Passport, Visa Card…" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-muted-light mb-1.5">Category</label>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as VaultCategory)}
              className="w-full appearance-none bg-base-surface border border-base-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            >
              {(Object.keys(CATEGORY_META) as VaultCategory[]).map((c) => (
                <option key={c} value={c} className="bg-base-surface">{CATEGORY_META[c].label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          </div>
        </div>

        {/* Folder */}
        {folders.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-muted-light mb-1.5">Folder (optional)</label>
            <div className="relative">
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full appearance-none bg-base-surface border border-base-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              >
                <option value="" className="bg-base-surface">No folder</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id} className="bg-base-surface">{f.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>
          </div>
        )}

        {/* ── Card fields ── */}
        {isCard && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 overflow-hidden">
            <Input label="Card number" placeholder="4242 4242 4242 4242" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
            <Input label="Card holder" placeholder="JOHN DOE" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Expiry" placeholder="MM/YY" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} />
              <div>
                <label className="block text-xs font-medium text-muted-light mb-1.5">CVV</label>
                <div className="relative">
                  <input
                    type={showCvv ? "text" : "password"}
                    placeholder="123"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    className="w-full bg-base-surface border border-base-border rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder:text-muted-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCvv((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                  >
                    {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-light mb-1.5">Card type</label>
              <div className="flex flex-wrap gap-2">
                {CARD_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCardType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      cardType === t ? "bg-accent-soft text-accent border border-accent/30" : "bg-base-surface text-muted-light border border-base-border hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Note fields ── */}
        {isNote && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
            <label className="block text-xs font-medium text-muted-light mb-1.5">Note</label>
            <textarea
              placeholder="Write your secure note here…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={5}
              className="w-full bg-base-surface border border-base-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-muted-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none"
            />
          </motion.div>
        )}

        {/* ── File / generic fields ── */}
        {!isCard && !isNote && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 overflow-hidden">
            {/* File picker */}
            <div>
              <label className="block text-xs font-medium text-muted-light mb-1.5">File <span className="text-danger">*</span></label>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
              {!fileData ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-base-border hover:border-accent/50 rounded-xl py-8 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-sm text-muted-light">Click to choose a file</span>
                  <span className="text-xs text-muted">Any file type · Max 10 MB</span>
                </button>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent-soft border border-accent/30">
                  <Paperclip className="w-5 h-5 text-accent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{fileName}</p>
                    <p className="text-xs text-muted">{fileMime} · {fileSize ? (fileSize / 1024).toFixed(1) + " KB" : ""}</p>
                  </div>
                  <button type="button" onClick={clearFile} className="text-muted hover:text-danger transition-colors flex-shrink-0">
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-light mb-1.5">Expiry date (optional)</label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} icon={<Calendar className="w-4 h-4" />} />
            </div>
          </motion.div>
        )}

        {/* Tags */}
        <Input
          label="Tags (comma-separated)"
          placeholder="personal, important, 2026"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          icon={<Tag className="w-4 h-4" />}
        />

        {/* Favorite toggle */}
        <button
          type="button"
          onClick={() => setFavorite((f) => !f)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
            favorite ? "bg-warning/10 border-warning/30" : "bg-base-surface border-base-border hover:border-base-hover"
          }`}
        >
          <span className="text-sm text-white flex items-center gap-2">
            <Star className="w-4 h-4" style={{ color: favorite ? "#F59E0B" : "#64748B" }} fill={favorite ? "#F59E0B" : "none"} />
            Mark as favorite
          </span>
          <span className={`text-xs ${favorite ? "text-warning" : "text-muted"}`}>{favorite ? "Favorite" : "Off"}</span>
        </button>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={handleSave} icon={<Plus className="w-4 h-4" />}>Save Item</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Folder modal ────────────────────────────────────────────────────────────
const FOLDER_COLORS = ["#00E5FF", "#22C55E", "#F59E0B", "#EF4444", "#EC4899", "#3B82F6"];

function FolderModal({
  open, onClose, onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(FOLDER_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) { setName(""); setColor(FOLDER_COLORS[0]); setError(""); setSaving(false); }
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim()) { setError("Please enter a folder name."); return; }
    setSaving(true);
    try {
      await onCreate(name.trim(), color);
      onClose();
    } catch {
      setError("Failed to create folder.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Folder" size="sm">
      <div className="space-y-4">
        {error && <p className="text-xs text-danger">{error}</p>}
        <Input label="Folder name" placeholder="e.g. Travel Documents" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <div>
          <label className="block text-xs font-medium text-muted-light mb-1.5">Color</label>
          <div className="flex gap-2">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-lg transition-all ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-base-surface scale-110" : "opacity-70 hover:opacity-100"}`}
                style={{ background: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={handleCreate} icon={<FolderPlus className="w-4 h-4" />}>Create</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isExpiringSoonFn(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const days = (new Date(expiresAt).getTime() - Date.now()) / 86400000;
  return days <= 30 && days >= 0;
}
