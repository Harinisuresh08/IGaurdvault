/*
# iGuard AI Vault — vault tables

## Overview
Extends the existing iGuard schema with three new tables that power the
digital secure vault: folders, encrypted vault items (documents, cards,
notes, IDs), and password manager entries. All three are owner-scoped with
four RLS policies each (SELECT/INSERT/UPDATE/DELETE) scoped to `authenticated`.

## New Tables

1. **vault_folders** — user-created folders to organise vault items
   (e.g. "Personal", "Work", "Banking"). `color` and `icon` tokens drive
   the UI. `parent_id` allows one level of nesting (null = root).

2. **vault_items** — the core vault entity. Each row stores a sensitive
   digital asset: PDF/image/video, an ID card (Aadhaar, PAN, Passport,
   Driving License), certificate, bank document, secure note, recovery
   code, or software license key. Sensitive text fields (`encrypted_data`,
   `card_number`, `card_cvv`, `note_text`) are encrypted client-side with
   AES-GCM before being sent to Supabase. File-based assets store a
   base64 payload in `file_data` (in a native app this would be Firebase
   Storage). `is_favorite` and `tags` support the browsing UX.

3. **password_entries** — password-manager records: website credentials,
   Wi-Fi passwords, ATM PIN reminders, UPI IDs, secure notes. The
   `password` field is encrypted client-side. `strength_score` is a 0-100
   estimate computed on the client.

## Security
- RLS enabled on every table.
- Four owner-scoped policies per table (SELECT/INSERT/UPDATE/DELETE).
- `user_id` defaults to `auth.uid()` on all three tables.
*/

-- ============ vault_folders ============
CREATE TABLE IF NOT EXISTS vault_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#00E5FF',
  icon text NOT NULL DEFAULT 'folder',
  parent_id uuid REFERENCES vault_folders(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE vault_folders ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_vault_folders_user ON vault_folders(user_id);

DROP POLICY IF EXISTS "select_own_vault_folders" ON vault_folders;
CREATE POLICY "select_own_vault_folders" ON vault_folders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_vault_folders" ON vault_folders;
CREATE POLICY "insert_own_vault_folders" ON vault_folders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_vault_folders" ON vault_folders;
CREATE POLICY "update_own_vault_folders" ON vault_folders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_vault_folders" ON vault_folders;
CREATE POLICY "delete_own_vault_folders" ON vault_folders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ vault_items ============
CREATE TABLE IF NOT EXISTS vault_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES vault_folders(id) ON DELETE SET NULL,
  title text NOT NULL,
  item_type text NOT NULL DEFAULT 'document',
  category text NOT NULL DEFAULT 'document',
  encrypted_data text,
  file_data text,
  file_name text,
  file_mime_type text,
  file_size_bytes bigint DEFAULT 0,
  card_number text,
  card_holder text,
  card_expiry text,
  card_cvv text,
  note_text text,
  is_favorite boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  thumbnail_base64 text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_vault_items_user ON vault_items(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_items_folder ON vault_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_vault_items_type ON vault_items(item_type);

DROP POLICY IF EXISTS "select_own_vault_items" ON vault_items;
CREATE POLICY "select_own_vault_items" ON vault_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_vault_items" ON vault_items;
CREATE POLICY "insert_own_vault_items" ON vault_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_vault_items" ON vault_items;
CREATE POLICY "update_own_vault_items" ON vault_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_vault_items" ON vault_items;
CREATE POLICY "delete_own_vault_items" ON vault_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ password_entries ============
CREATE TABLE IF NOT EXISTS password_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  entry_type text NOT NULL DEFAULT 'website',
  website text,
  username text,
  password text,
  url text,
  notes text,
  strength_score int DEFAULT 0,
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE password_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_password_entries_user ON password_entries(user_id);

DROP POLICY IF EXISTS "select_own_password_entries" ON password_entries;
CREATE POLICY "select_own_password_entries" ON password_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_password_entries" ON password_entries;
CREATE POLICY "insert_own_password_entries" ON password_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_password_entries" ON password_entries;
CREATE POLICY "update_own_password_entries" ON password_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_password_entries" ON password_entries;
CREATE POLICY "delete_own_password_entries" ON password_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- updated_at triggers for vault tables
DROP TRIGGER IF EXISTS trg_vault_items_updated_at ON vault_items;
CREATE TRIGGER trg_vault_items_updated_at
  BEFORE UPDATE ON vault_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_password_entries_updated_at ON password_entries;
CREATE TRIGGER trg_password_entries_updated_at
  BEFORE UPDATE ON password_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
