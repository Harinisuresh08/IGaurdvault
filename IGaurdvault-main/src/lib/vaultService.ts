import { supabase } from "@/lib/supabase";
import { encryptFields, passwordStrength } from "@/lib/crypto";
import type { VaultItem, VaultFolder, PasswordEntry, VaultCategory, PasswordEntryType } from "@/types";

export async function fetchFolders(userId: string): Promise<VaultFolder[]> {
  const { data, error } = await supabase.from("vault_folders").select("*").eq("user_id", userId).order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createFolder(userId: string, name: string, icon = "folder", color = "#00E5FF", parentId: string | null = null): Promise<VaultFolder> {
  const { data, error } = await supabase.from("vault_folders").insert({ user_id: userId, name, icon, color, parent_id: parentId }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFolder(folderId: string): Promise<void> {
  const { error } = await supabase.from("vault_folders").delete().eq("id", folderId);
  if (error) throw error;
}

export async function fetchVaultItems(userId: string): Promise<VaultItem[]> {
  const { data, error } = await supabase.from("vault_items").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createVaultItem(userId: string, params: {
  title: string; category: VaultCategory; folder_id?: string | null;
  card_number?: string | null; card_holder?: string | null; card_expiry?: string | null;
  card_cvv?: string | null; card_type?: string | null; note_text?: string | null;
  file_name?: string | null; file_mime_type?: string | null; file_size_bytes?: number | null;
  file_data?: string | null; thumbnail_base64?: string | null;
  tags?: string[]; is_favorite?: boolean; expires_at?: string | null;
}): Promise<VaultItem> {
  const encrypted = await encryptFields({
    card_number: params.card_number ?? null, card_expiry: params.card_expiry ?? null,
    card_cvv: params.card_cvv ?? null, note_text: params.note_text ?? null,
  });
  const { data, error } = await supabase.from("vault_items").insert({
    user_id: userId, title: params.title, item_type: params.category, category: params.category,
    folder_id: params.folder_id ?? null, card_number: encrypted.card_number, card_holder: params.card_holder ?? null,
    card_expiry: encrypted.card_expiry, card_cvv: encrypted.card_cvv, card_type: params.card_type ?? null,
    note_text: encrypted.note_text, file_name: params.file_name ?? null, file_mime_type: params.file_mime_type ?? null,
    file_size_bytes: params.file_size_bytes ?? null, file_data: params.file_data ?? null,
    thumbnail_base64: params.thumbnail_base64 ?? null, tags: params.tags ?? [],
    is_favorite: params.is_favorite ?? false, expires_at: params.expires_at ?? null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateVaultItem(itemId: string, params: Partial<{
  title: string; category: VaultCategory; folder_id: string | null;
  card_number: string | null; card_holder: string | null; card_expiry: string | null;
  card_cvv: string | null; card_type: string | null; note_text: string | null;
  tags: string[]; is_favorite: boolean; expires_at: string | null;
}>): Promise<VaultItem> {
  const encrypted = await encryptFields({
    card_number: params.card_number ?? null, card_expiry: params.card_expiry ?? null,
    card_cvv: params.card_cvv ?? null, note_text: params.note_text ?? null,
  });
  const updateData: Record<string, unknown> = {
    card_number: encrypted.card_number, card_holder: params.card_holder ?? null,
    card_expiry: encrypted.card_expiry, card_cvv: encrypted.card_cvv,
    card_type: params.card_type ?? null, note_text: encrypted.note_text,
    updated_at: new Date().toISOString(),
  };
  if (params.title !== undefined) updateData.title = params.title;
  if (params.category !== undefined) { updateData.category = params.category; updateData.item_type = params.category; }
  if (params.folder_id !== undefined) updateData.folder_id = params.folder_id;
  if (params.tags !== undefined) updateData.tags = params.tags;
  if (params.is_favorite !== undefined) updateData.is_favorite = params.is_favorite;
  if (params.expires_at !== undefined) updateData.expires_at = params.expires_at;
  const { data, error } = await supabase.from("vault_items").update(updateData).eq("id", itemId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteVaultItem(itemId: string): Promise<void> {
  const { error } = await supabase.from("vault_items").delete().eq("id", itemId);
  if (error) throw error;
}

export async function touchVaultItem(itemId: string): Promise<void> {
  await supabase.from("vault_items").update({ last_viewed_at: new Date().toISOString() }).eq("id", itemId);
}

export async function fetchPasswords(userId: string): Promise<PasswordEntry[]> {
  const { data, error } = await supabase.from("password_entries").select("*").eq("user_id", userId).order("title");
  if (error) throw error;
  return data ?? [];
}

export async function createPasswordEntry(userId: string, params: {
  entry_type: PasswordEntryType; title: string; website?: string | null;
  username?: string | null; password?: string | null; url?: string | null;
  notes?: string | null; is_favorite?: boolean;
}): Promise<PasswordEntry> {
  const encrypted = await encryptFields({ password: params.password ?? null, notes: params.notes ?? null });
  const strength = params.password ? passwordStrength(params.password) : { score: 0 };
  const { data, error } = await supabase.from("password_entries").insert({
    user_id: userId, entry_type: params.entry_type, title: params.title,
    website: params.website ?? null, username: params.username ?? null,
    password: encrypted.password, url: params.url ?? null, notes: encrypted.notes,
    strength_score: strength.score, is_weak: strength.score < 50, is_duplicate: false, is_old: false,
    is_favorite: params.is_favorite ?? false,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updatePasswordEntry(entryId: string, params: Partial<{
  entry_type: PasswordEntryType; title: string; website: string | null;
  username: string | null; password: string | null; url: string | null;
  notes: string | null; is_favorite: boolean;
}>): Promise<PasswordEntry> {
  const encrypted = await encryptFields({ password: params.password ?? null, notes: params.notes ?? null });
  const strength = params.password ? passwordStrength(params.password) : undefined;
  const updateData: Record<string, unknown> = {
    password: encrypted.password, notes: encrypted.notes, updated_at: new Date().toISOString(),
  };
  if (params.entry_type !== undefined) updateData.entry_type = params.entry_type;
  if (params.title !== undefined) updateData.title = params.title;
  if (params.website !== undefined) updateData.website = params.website;
  if (params.username !== undefined) updateData.username = params.username;
  if (params.url !== undefined) updateData.url = params.url;
  if (params.is_favorite !== undefined) updateData.is_favorite = params.is_favorite;
  if (strength) { updateData.strength_score = strength.score; updateData.is_weak = strength.score < 50; }
  const { data, error } = await supabase.from("password_entries").update(updateData).eq("id", entryId).select().single();
  if (error) throw error;
  return data;
}

export async function deletePasswordEntry(entryId: string): Promise<void> {
  const { error } = await supabase.from("password_entries").delete().eq("id", entryId);
  if (error) throw error;
}

export function detectDuplicates(entries: PasswordEntry[]): Set<string> {
  const seen = new Map<string, string[]>();
  for (const entry of entries) {
    if (!entry.password) continue;
    const existing = seen.get(entry.password) ?? [];
    existing.push(entry.id);
    seen.set(entry.password, existing);
  }
  const duplicateIds = new Set<string>();
  for (const ids of seen.values()) if (ids.length > 1) ids.forEach((id) => duplicateIds.add(id));
  return duplicateIds;
}
