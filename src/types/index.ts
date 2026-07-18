// ─── Auth & Profile ──────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_email: string | null;
  emergency_contact_phone: string | null;
  settings: UserSettings;
  face_registered: boolean;
  pin_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  face_recognition: boolean;
  pin_auth: boolean;
  biometric_auth: boolean;
  behavior_detection: boolean;
  location_tracking: boolean;
  trusted_devices_monitoring: boolean;
  trusted_locations_monitoring: boolean;
  notifications: boolean;
  emergency_mode: boolean;
  dark_mode: boolean;
  auto_lock_minutes: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  face_recognition: true,
  pin_auth: true,
  biometric_auth: false,
  behavior_detection: true,
  location_tracking: true,
  trusted_devices_monitoring: true,
  trusted_locations_monitoring: true,
  notifications: true,
  emergency_mode: true,
  dark_mode: true,
  auto_lock_minutes: 5,
};

// ─── Security Score & Risk ───────────────────────────────────

export type RiskLevel = "safe" | "low" | "medium" | "high" | "critical";

export interface SecurityScore {
  score: number;
  level: RiskLevel;
  factors: ScoreFactor[];
  updated_at: string;
}

export interface ScoreFactor {
  key: string;
  label: string;
  status: "good" | "warning" | "danger";
  penalty: number;
  detail: string;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  reasons: string[];
  recommendations: string[];
  confidence: number;
  action: RiskAction;
  timestamp: string;
}

export type RiskAction =
  | "grant_access"
  | "require_pin"
  | "require_biometric"
  | "block_access"
  | "capture_evidence";

// ─── Events & Timeline ───────────────────────────────────────

export type EventType =
  | "login_success" | "login_failure" | "face_match" | "face_mismatch"
  | "intruder_detected" | "vault_item_added" | "vault_item_viewed"
  | "vault_item_deleted" | "password_added" | "password_viewed"
  | "folder_created" | "backup_completed" | "alert_generated"
  | "recommendation_generated" | "setting_changed" | "report_generated";

export interface SecurityEvent {
  id: string;
  user_id: string;
  event_type: EventType;
  title: string;
  description: string | null;
  severity: "info" | "low" | "medium" | "high" | "critical";
  metadata: Record<string, unknown>;
  risk_score: number | null;
  location: string | null;
  device_info: string | null;
  created_at: string;
}

// ─── Intruder ────────────────────────────────────────────────

export interface IntruderEvent {
  id: string;
  user_id: string;
  photo_base64: string | null;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  device_name: string | null;
  phone_model: string | null;
  os_version: string | null;
  network_type: string | null;
  wifi_status: string | null;
  bluetooth_status: string | null;
  battery_percentage: number | null;
  charging_status: string | null;
  confidence_score: number;
  threat_level: RiskLevel;
  status: "new" | "reviewed" | "resolved";
  ai_explanation: string;
  evidence: Record<string, unknown>;
  created_at: string;
}

// ─── Vault ───────────────────────────────────────────────────

export type VaultCategory =
  | "document" | "passport" | "pan_card" | "aadhaar" | "driving_license"
  | "medical" | "certificate" | "card" | "note" | "recovery_code"
  | "license_key" | "private_file" | "image" | "video";

export interface VaultFolder {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  parent_id: string | null;
  created_at: string;
}

export interface VaultItem {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  item_type: string;
  category: VaultCategory;
  encrypted_data: string | null;
  file_data: string | null;
  file_name: string | null;
  file_mime_type: string | null;
  file_size_bytes: number | null;
  card_number: string | null;
  card_holder: string | null;
  card_expiry: string | null;
  card_cvv: string | null;
  card_type: string | null;
  note_text: string | null;
  is_favorite: boolean;
  tags: string[];
  thumbnail_base64: string | null;
  ai_category: string | null;
  ocr_text: string | null;
  expires_at: string | null;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CATEGORY_META_T {
  label: string;
  icon: string;
  color: string;
  group: "documents" | "identity" | "financial" | "personal" | "other";
}

export const CATEGORY_META: Record<VaultCategory, CATEGORY_META_T> = {
  document: { label: "Document", icon: "FileText", color: "#00E5FF", group: "documents" },
  passport: { label: "Passport", icon: "BookMarked", color: "#3B82F6", group: "identity" },
  pan_card: { label: "PAN Card", icon: "CreditCard", color: "#8B5CF6", group: "identity" },
  aadhaar: { label: "Aadhaar", icon: "IdCard", color: "#06B6D4", group: "identity" },
  driving_license: { label: "Driving License", icon: "Car", color: "#10B981", group: "identity" },
  medical: { label: "Medical Record", icon: "HeartPulse", color: "#EF4444", group: "personal" },
  certificate: { label: "Certificate", icon: "Award", color: "#F59E0B", group: "documents" },
  card: { label: "Card", icon: "CreditCard", color: "#EC4899", group: "financial" },
  note: { label: "Secure Note", icon: "StickyNote", color: "#84CC16", group: "personal" },
  recovery_code: { label: "Recovery Code", icon: "KeyRound", color: "#F97316", group: "other" },
  license_key: { label: "License Key", icon: "KeyRound", color: "#A855F7", group: "other" },
  private_file: { label: "Private File", icon: "Lock", color: "#64748B", group: "other" },
  image: { label: "Image", icon: "Image", color: "#14B8A6", group: "personal" },
  video: { label: "Video", icon: "Video", color: "#D946EF", group: "personal" },
};

export type VaultCategoryGroup = "all" | "documents" | "identity" | "financial" | "personal" | "other" | "favorites";

// ─── Password Manager ────────────────────────────────────────

export type PasswordEntryType =
  | "website" | "wifi" | "bank_credential" | "atm_pin"
  | "upi_id" | "recovery_code" | "secure_note";

export interface PasswordEntry {
  id: string;
  user_id: string;
  entry_type: PasswordEntryType;
  title: string;
  website: string | null;
  username: string | null;
  password: string | null;
  url: string | null;
  notes: string | null;
  strength_score: number;
  is_weak: boolean;
  is_duplicate: boolean;
  is_old: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export const PASSWORD_TYPE_META: Record<PasswordEntryType, { label: string; icon: string; color: string }> = {
  website: { label: "Website", icon: "Globe", color: "#00E5FF" },
  wifi: { label: "Wi-Fi", icon: "Wifi", color: "#22C55E" },
  bank_credential: { label: "Bank", icon: "Landmark", color: "#F59E0B" },
  atm_pin: { label: "ATM PIN", icon: "Hash", color: "#EF4444" },
  upi_id: { label: "UPI ID", icon: "Smartphone", color: "#8B5CF6" },
  recovery_code: { label: "Recovery Code", icon: "KeyRound", color: "#F97316" },
  secure_note: { label: "Secure Note", icon: "StickyNote", color: "#84CC16" },
};

// ─── Trusted Devices & Locations ─────────────────────────────

export interface TrustedDevice {
  id: string;
  user_id: string;
  device_name: string;
  device_type: string;
  identifier: string;
  last_seen: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TrustedLocation {
  id: string;
  user_id: string;
  label: string;
  category: string;
  latitude: number;
  longitude: number;
  radius_m: number;
  icon: string;
  created_at: string;
}

// ─── Behavior ────────────────────────────────────────────────

export interface BehaviorSample {
  id: string;
  user_id: string;
  unlock_time: string | null;
  screen_on_duration_min: number | null;
  motion_acceleration: number | null;
  latitude: number | null;
  longitude: number | null;
  usage_pattern: string | null;
  repeated_failures: number;
  anomaly_label: string;
  confidence: number;
  explanation: string | null;
  created_at: string;
}

// ─── Notifications & Chat ────────────────────────────────────

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: "info" | "warning" | "danger" | "success";
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── Recommendations ─────────────────────────────────────────

export interface Recommendation {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: "password" | "vault" | "security" | "backup" | "behavior";
  priority: "low" | "medium" | "high" | "critical";
  action_url: string | null;
  is_resolved: boolean;
  created_at: string;
}

// ─── AI Assistant ────────────────────────────────────────────

export interface AIInsight {
  type: "warning" | "info" | "success" | "danger";
  title: string;
  message: string;
  action?: string;
  icon?: string;
}
