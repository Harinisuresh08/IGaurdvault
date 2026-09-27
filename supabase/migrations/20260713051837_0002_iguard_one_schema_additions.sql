/*
# iGuard One — Schema Additions for AI Guardian Upgrade

## Overview
Adds missing columns to existing tables and creates the recommendations table.
All additions are ADD COLUMN (non-destructive — no data is lost).

## Changes

### profiles
- Add email text (user's email from auth)
- Add phone text
- Add face_registered boolean (face registration status)
- Add pin_hash text (hashed vault PIN)

### threat_events
- Add risk_score numeric (AI risk score for the event)
- Add location text (approximate location)
- Add device_info text (device information)

### intruder_events
- Add ai_explanation text (AI-generated explanation)
- Add evidence jsonb (structured evidence data)

### vault_items
- Add card_type text (credit/debit card type)
- Add expires_at timestamptz (document/card expiry)
- Add last_viewed_at timestamptz (last access timestamp)
- Add ai_category text (AI classification)
- Add ocr_text text (extracted text from OCR)

### password_entries
- Add is_weak boolean (password strength flag)
- Add is_duplicate boolean (duplicate password flag)
- Add is_old boolean (old password flag)

### notifications
- Add action_url text (deep link for notification action)

### New table: recommendations
- AI-generated security recommendations with priority, category, and resolution status
- RLS enabled with 4 owner-scoped policies

## Security
- recommendations table has full RLS with 4 policies
- All new columns are nullable to maintain backward compatibility
*/

-- ─── profiles additions ─────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE profiles ADD COLUMN email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE profiles ADD COLUMN phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'face_registered') THEN
    ALTER TABLE profiles ADD COLUMN face_registered boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'pin_hash') THEN
    ALTER TABLE profiles ADD COLUMN pin_hash text;
  END IF;
END $$;

-- ─── threat_events additions ────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'threat_events' AND column_name = 'risk_score') THEN
    ALTER TABLE threat_events ADD COLUMN risk_score numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'threat_events' AND column_name = 'location') THEN
    ALTER TABLE threat_events ADD COLUMN location text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'threat_events' AND column_name = 'device_info') THEN
    ALTER TABLE threat_events ADD COLUMN device_info text;
  END IF;
END $$;

-- ─── intruder_events additions ──────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intruder_events' AND column_name = 'ai_explanation') THEN
    ALTER TABLE intruder_events ADD COLUMN ai_explanation text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intruder_events' AND column_name = 'evidence') THEN
    ALTER TABLE intruder_events ADD COLUMN evidence jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- ─── vault_items additions ──────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_items' AND column_name = 'card_type') THEN
    ALTER TABLE vault_items ADD COLUMN card_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_items' AND column_name = 'expires_at') THEN
    ALTER TABLE vault_items ADD COLUMN expires_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_items' AND column_name = 'last_viewed_at') THEN
    ALTER TABLE vault_items ADD COLUMN last_viewed_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_items' AND column_name = 'ai_category') THEN
    ALTER TABLE vault_items ADD COLUMN ai_category text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_items' AND column_name = 'ocr_text') THEN
    ALTER TABLE vault_items ADD COLUMN ocr_text text;
  END IF;
END $$;

-- ─── password_entries additions ─────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'password_entries' AND column_name = 'is_weak') THEN
    ALTER TABLE password_entries ADD COLUMN is_weak boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'password_entries' AND column_name = 'is_duplicate') THEN
    ALTER TABLE password_entries ADD COLUMN is_duplicate boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'password_entries' AND column_name = 'is_old') THEN
    ALTER TABLE password_entries ADD COLUMN is_old boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ─── notifications additions ────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_url') THEN
    ALTER TABLE notifications ADD COLUMN action_url text;
  END IF;
END $$;

-- ─── recommendations table ──────────────────────────────────

CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'security',
  priority text NOT NULL DEFAULT 'medium',
  action_url text,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_recommendations" ON recommendations;
CREATE POLICY "select_own_recommendations" ON recommendations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_recommendations" ON recommendations;
CREATE POLICY "insert_own_recommendations" ON recommendations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_recommendations" ON recommendations;
CREATE POLICY "update_own_recommendations" ON recommendations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_recommendations" ON recommendations;
CREATE POLICY "delete_own_recommendations" ON recommendations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_recommendations_user ON recommendations(user_id, created_at DESC);
