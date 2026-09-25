/*
# iGuard AI Core Schema

## Overview
Creates the complete multi-tenant schema for iGuard AI, a premium smartphone
security application. Every table is owner-scoped to the authenticated user
via `user_id uuid DEFAULT auth.uid()`, and protected with four separate RLS
policies (SELECT/INSERT/UPDATE/DELETE) scoped to `authenticated`.

## New Tables

1. **profiles** — user profile data (display name, avatar URL, emergency
   contact, settings flags). One row per auth user, keyed by `id = auth.uid()`.
2. **face_embeddings** — stores face enrollment captures. Each row is one
   captured image (front/left/right/up/down/smile/etc.) with a base64
   thumbnail and a numeric embedding vector (JSONB array of floats).
3. **intruder_events** — evidence captured when an unknown face or suspicious
   activity is detected. Stores photo (base64), GPS, device metadata, network
   info, battery, confidence score, threat level, and status.
4. **threat_events** — chronological security timeline entries: logins,
   unknown faces, intruder captures, location changes, behavior anomalies,
   reports, alerts.
5. **behavior_samples** — telemetry used for behavioral anomaly detection:
   unlock time, screen-on duration, motion/acceleration, location, usage
   pattern, repeated failures. Includes anomaly label and confidence.
6. **trusted_locations** — saved safe places (Home, Office, College, etc.)
   with lat/lng, radius, and an icon/color token.
7. **trusted_devices** — registered Bluetooth devices and Wi-Fi networks
   considered safe. Unknown devices increase risk.
8. **security_score_log** — time-series of AI security score (0-100) with
   the per-factor breakdown (JSONB) and risk tier label.
9. **security_reports** — generated PDF report metadata (the PDF is stored
   as a base64 blob here; in a mobile build it would go to Firebase Storage).
10. **chat_messages** — AI Security Assistant conversation history
    (role + content + optional metadata).
11. **notifications** — in-app notification center entries (FCM/local-style).

## Security
- RLS enabled on every table.
- Four owner-scoped policies per table (SELECT/INSERT/UPDATE/DELETE) scoped
  to `authenticated` using `auth.uid() = user_id`.
- `profiles` is keyed by `id = auth.uid()` directly.
- All owner columns default to `auth.uid()` so inserts that omit `user_id`
  still satisfy WITH CHECK.
*/

-- ============ profiles ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'User',
  avatar_url text,
  emergency_contact_name text,
  emergency_contact_email text,
  emergency_contact_phone text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ============ face_embeddings ============
CREATE TABLE IF NOT EXISTS face_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  pose text NOT NULL,
  image_base64 text NOT NULL,
  embedding jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE face_embeddings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_face_embeddings_user ON face_embeddings(user_id);

DROP POLICY IF EXISTS "select_own_face_embeddings" ON face_embeddings;
CREATE POLICY "select_own_face_embeddings" ON face_embeddings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_face_embeddings" ON face_embeddings;
CREATE POLICY "insert_own_face_embeddings" ON face_embeddings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_face_embeddings" ON face_embeddings;
CREATE POLICY "update_own_face_embeddings" ON face_embeddings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_face_embeddings" ON face_embeddings;
CREATE POLICY "delete_own_face_embeddings" ON face_embeddings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ intruder_events ============
CREATE TABLE IF NOT EXISTS intruder_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_base64 text,
  latitude double precision,
  longitude double precision,
  location_label text,
  device_name text,
  phone_model text,
  os_version text,
  network_type text,
  wifi_status text,
  bluetooth_status text,
  battery_percentage int,
  charging_status text,
  confidence_score double precision NOT NULL DEFAULT 0,
  threat_level text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE intruder_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_intruder_events_user ON intruder_events(user_id);
CREATE INDEX IF NOT EXISTS idx_intruder_events_created ON intruder_events(created_at DESC);

DROP POLICY IF EXISTS "select_own_intruder_events" ON intruder_events;
CREATE POLICY "select_own_intruder_events" ON intruder_events FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_intruder_events" ON intruder_events;
CREATE POLICY "insert_own_intruder_events" ON intruder_events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_intruder_events" ON intruder_events;
CREATE POLICY "update_own_intruder_events" ON intruder_events FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_intruder_events" ON intruder_events;
CREATE POLICY "delete_own_intruder_events" ON intruder_events FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ threat_events ============
CREATE TABLE IF NOT EXISTS threat_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'info',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE threat_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_threat_events_user ON threat_events(user_id);
CREATE INDEX IF NOT EXISTS idx_threat_events_created ON threat_events(created_at DESC);

DROP POLICY IF EXISTS "select_own_threat_events" ON threat_events;
CREATE POLICY "select_own_threat_events" ON threat_events FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_threat_events" ON threat_events;
CREATE POLICY "insert_own_threat_events" ON threat_events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_threat_events" ON threat_events;
CREATE POLICY "update_own_threat_events" ON threat_events FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_threat_events" ON threat_events;
CREATE POLICY "delete_own_threat_events" ON threat_events FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ behavior_samples ============
CREATE TABLE IF NOT EXISTS behavior_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  unlock_time text,
  screen_on_duration_min int,
  motion_acceleration double precision,
  latitude double precision,
  longitude double precision,
  usage_pattern text,
  repeated_failures int DEFAULT 0,
  anomaly_label text NOT NULL DEFAULT 'normal',
  confidence double precision DEFAULT 0,
  explanation text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE behavior_samples ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_behavior_samples_user ON behavior_samples(user_id);

DROP POLICY IF EXISTS "select_own_behavior_samples" ON behavior_samples;
CREATE POLICY "select_own_behavior_samples" ON behavior_samples FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_behavior_samples" ON behavior_samples;
CREATE POLICY "insert_own_behavior_samples" ON behavior_samples FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_behavior_samples" ON behavior_samples;
CREATE POLICY "update_own_behavior_samples" ON behavior_samples FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_behavior_samples" ON behavior_samples;
CREATE POLICY "delete_own_behavior_samples" ON behavior_samples FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ trusted_locations ============
CREATE TABLE IF NOT EXISTS trusted_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'home',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius_m int NOT NULL DEFAULT 150,
  icon text DEFAULT 'home',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE trusted_locations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_trusted_locations_user ON trusted_locations(user_id);

DROP POLICY IF EXISTS "select_own_trusted_locations" ON trusted_locations;
CREATE POLICY "select_own_trusted_locations" ON trusted_locations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_trusted_locations" ON trusted_locations;
CREATE POLICY "insert_own_trusted_locations" ON trusted_locations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_trusted_locations" ON trusted_locations;
CREATE POLICY "update_own_trusted_locations" ON trusted_locations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_trusted_locations" ON trusted_locations;
CREATE POLICY "delete_own_trusted_locations" ON trusted_locations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ trusted_devices ============
CREATE TABLE IF NOT EXISTS trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name text NOT NULL,
  device_type text NOT NULL DEFAULT 'bluetooth',
  identifier text NOT NULL,
  last_seen timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);

DROP POLICY IF EXISTS "select_own_trusted_devices" ON trusted_devices;
CREATE POLICY "select_own_trusted_devices" ON trusted_devices FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_trusted_devices" ON trusted_devices;
CREATE POLICY "insert_own_trusted_devices" ON trusted_devices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_trusted_devices" ON trusted_devices;
CREATE POLICY "update_own_trusted_devices" ON trusted_devices FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_trusted_devices" ON trusted_devices;
CREATE POLICY "delete_own_trusted_devices" ON trusted_devices FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ security_score_log ============
CREATE TABLE IF NOT EXISTS security_score_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  score int NOT NULL DEFAULT 75,
  risk_tier text NOT NULL DEFAULT 'medium',
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE security_score_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_security_score_log_user ON security_score_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_score_log_created ON security_score_log(created_at DESC);

DROP POLICY IF EXISTS "select_own_security_score_log" ON security_score_log;
CREATE POLICY "select_own_security_score_log" ON security_score_log FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_security_score_log" ON security_score_log;
CREATE POLICY "insert_own_security_score_log" ON security_score_log FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_security_score_log" ON security_score_log;
CREATE POLICY "update_own_security_score_log" ON security_score_log FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_security_score_log" ON security_score_log;
CREATE POLICY "delete_own_security_score_log" ON security_score_log FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ security_reports ============
CREATE TABLE IF NOT EXISTS security_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  period_start timestamptz,
  period_end timestamptz,
  report_type text NOT NULL DEFAULT 'weekly',
  summary jsonb DEFAULT '{}'::jsonb,
  pdf_base64 text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE security_reports ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_security_reports_user ON security_reports(user_id);

DROP POLICY IF EXISTS "select_own_security_reports" ON security_reports;
CREATE POLICY "select_own_security_reports" ON security_reports FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_security_reports" ON security_reports;
CREATE POLICY "insert_own_security_reports" ON security_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_security_reports" ON security_reports;
CREATE POLICY "update_own_security_reports" ON security_reports FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_security_reports" ON security_reports;
CREATE POLICY "delete_own_security_reports" ON security_reports FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ chat_messages ============
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);

DROP POLICY IF EXISTS "select_own_chat_messages" ON chat_messages;
CREATE POLICY "select_own_chat_messages" ON chat_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_chat_messages" ON chat_messages;
CREATE POLICY "insert_own_chat_messages" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_chat_messages" ON chat_messages;
CREATE POLICY "delete_own_chat_messages" ON chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ notifications ============
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
