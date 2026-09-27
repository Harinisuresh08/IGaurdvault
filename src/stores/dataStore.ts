import { create } from "zustand";
import type {
  SecurityEvent, IntruderEvent, VaultItem, VaultFolder, PasswordEntry,
  TrustedDevice, TrustedLocation, BehaviorSample, AppNotification,
  ChatMessage, Recommendation,
} from "@/types";
import { setItemEncrypted, getItemDecrypted } from "@/lib/secureStorage";

interface DataState {
  securityEvents: SecurityEvent[];
  intruderEvents: IntruderEvent[];
  vaultFolders: VaultFolder[];
  vaultItems: VaultItem[];
  passwordEntries: PasswordEntry[];
  trustedDevices: TrustedDevice[];
  trustedLocations: TrustedLocation[];
  behaviorSamples: BehaviorSample[];
  notifications: AppNotification[];
  chatMessages: ChatMessage[];
  recommendations: Recommendation[];
  loading: boolean;
  loaded: boolean;
  faceEmbeddings: any[];
  threatEvents: SecurityEvent[];
  scoreLogs: any[];
  loadAll: (userId: string) => Promise<void>;
  subscribe: (userId: string) => (() => void) | null;
  addChatMessage: (msg: ChatMessage) => void;
  addSecurityEvent: (event: SecurityEvent) => void;
  addIntruderEvent: (event: IntruderEvent) => void;
  syncOfflineData: () => Promise<void>;
}

const MOCK_DATE = new Date().toISOString();
const MOCK_YESTERDAY = new Date(Date.now() - 86400000).toISOString();
const MOCK_LAST_WEEK = new Date(Date.now() - 86400000 * 5).toISOString();

const MOCK_PASSWORDS: PasswordEntry[] = [
  { id: "1", user_id: "demo", entry_type: "website", title: "Google", website: "google.com", username: "user@gmail.com", password: "encrypted", url: "https://google.com", notes: null, strength_score: 95, is_weak: false, is_duplicate: false, is_old: false, is_favorite: true, created_at: MOCK_LAST_WEEK, updated_at: MOCK_DATE },
  { id: "2", user_id: "demo", entry_type: "website", title: "GitHub", website: "github.com", username: "devuser", password: "encrypted", url: "https://github.com", notes: null, strength_score: 90, is_weak: false, is_duplicate: false, is_old: false, is_favorite: false, created_at: MOCK_LAST_WEEK, updated_at: MOCK_DATE },
  { id: "3", user_id: "demo", entry_type: "website", title: "Facebook", website: "facebook.com", username: "demo123", password: "password123", url: "https://facebook.com", notes: "Needs update", strength_score: 20, is_weak: true, is_duplicate: false, is_old: true, is_favorite: false, created_at: MOCK_LAST_WEEK, updated_at: MOCK_DATE },
  { id: "4", user_id: "demo", entry_type: "bank_credential", title: "Chase Bank", website: "chase.com", username: "chase_user", password: "encrypted", url: "https://chase.com", notes: null, strength_score: 100, is_weak: false, is_duplicate: false, is_old: false, is_favorite: true, created_at: MOCK_LAST_WEEK, updated_at: MOCK_DATE },
  { id: "5", user_id: "demo", entry_type: "wifi", title: "Home Network", website: null, username: "NETGEAR-5G", password: "password123", url: null, notes: null, strength_score: 20, is_weak: true, is_duplicate: true, is_old: false, is_favorite: false, created_at: MOCK_LAST_WEEK, updated_at: MOCK_DATE },
];

const MOCK_VAULT: VaultItem[] = [
  { id: "v1", user_id: "demo", folder_id: null, title: "Passport Copy", item_type: "document", category: "passport", encrypted_data: "data", file_data: null, file_name: "passport.pdf", file_mime_type: "application/pdf", file_size_bytes: 1024000, card_number: null, card_holder: null, card_expiry: null, card_cvv: null, card_type: null, note_text: null, is_favorite: true, tags: ["travel", "id"], thumbnail_base64: null, ai_category: "identity", ocr_text: "PASSPORT OF DEMO", expires_at: "2030-01-01T00:00:00.000Z", last_viewed_at: MOCK_DATE, created_at: MOCK_LAST_WEEK, updated_at: MOCK_DATE },
  { id: "v2", user_id: "demo", folder_id: null, title: "Amex Platinum", item_type: "card", category: "card", encrypted_data: "data", file_data: null, file_name: null, file_mime_type: null, file_size_bytes: null, card_number: "**** **** **** 1005", card_holder: "Demo User", card_expiry: "12/28", card_cvv: "***", card_type: "amex", note_text: null, is_favorite: true, tags: ["finance"], thumbnail_base64: null, ai_category: "financial", ocr_text: null, expires_at: null, last_viewed_at: MOCK_YESTERDAY, created_at: MOCK_LAST_WEEK, updated_at: MOCK_DATE },
  { id: "v3", user_id: "demo", folder_id: null, title: "Recovery Phrase", item_type: "note", category: "recovery_code", encrypted_data: "data", file_data: null, file_name: null, file_mime_type: null, file_size_bytes: null, card_number: null, card_holder: null, card_expiry: null, card_cvv: null, card_type: null, note_text: "word1 word2 word3...", is_favorite: false, tags: ["crypto"], thumbnail_base64: null, ai_category: "other", ocr_text: null, expires_at: null, last_viewed_at: null, created_at: MOCK_LAST_WEEK, updated_at: MOCK_DATE },
];

const MOCK_INTRUDERS: IntruderEvent[] = [
  { id: "i1", user_id: "demo", photo_base64: null, image_url: "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=500&h=500&fit=crop", latitude: 37.7749, longitude: -122.4194, location_label: "San Francisco, CA", location: "San Francisco, CA", device_name: "Unknown iPhone", device_info: "iOS 16.5 / Safari", phone_model: "iPhone 13", os_version: "iOS 16.5", network_type: "LTE", wifi_status: "disconnected", bluetooth_status: "off", battery_percentage: 20, charging_status: "unplugged", confidence_score: 98, risk_score: 85, failed_attempts: 3, threat_level: "high", status: "new", ai_explanation: "Failed face match 3 times from an unrecognized location and untrusted device.", evidence: {}, created_at: MOCK_YESTERDAY },
];

const MOCK_SECURITY_EVENTS: SecurityEvent[] = [
  { id: "e1", user_id: "demo", event_type: "login_success", title: "Successful Login", description: "Face matched with 99% confidence.", severity: "info", metadata: {}, risk_score: 5, location: "Home", device_info: "MacBook Pro", created_at: MOCK_DATE },
  { id: "e2", user_id: "demo", event_type: "intruder_detected", title: "Intruder Alert", description: "Unknown person attempted to unlock vault.", severity: "high", metadata: {}, risk_score: 85, location: "San Francisco, CA", device_info: "iPhone 13", created_at: MOCK_YESTERDAY },
  { id: "e3", user_id: "demo", event_type: "vault_item_viewed", title: "Passport Viewed", description: "Vault unlocked with PIN.", severity: "low", metadata: {}, risk_score: 10, location: "Home", device_info: "MacBook Pro", created_at: MOCK_LAST_WEEK },
];

export const useDataStore = create<DataState>((set, get) => ({
  securityEvents: MOCK_SECURITY_EVENTS,
  intruderEvents: MOCK_INTRUDERS,
  vaultFolders: [],
  vaultItems: MOCK_VAULT,
  passwordEntries: MOCK_PASSWORDS,
  trustedDevices: [{ id: "d1", user_id: "demo", device_name: "MacBook Pro", device_type: "laptop", identifier: "mac-123", last_seen: MOCK_DATE, is_active: true, created_at: MOCK_LAST_WEEK }],
  trustedLocations: [{ id: "l1", user_id: "demo", label: "Home", category: "home", latitude: 37.77, longitude: -122.41, radius_m: 100, icon: "Home", created_at: MOCK_LAST_WEEK }],
  behaviorSamples: [],
  notifications: [{ id: "n1", user_id: "demo", title: "Welcome to Demo", body: "You are viewing the interactive demo.", type: "info", is_read: false, action_url: null, created_at: MOCK_DATE }],
  chatMessages: [
    { id: "c1", user_id: "demo", role: "assistant", content: "Hello! I am your AI Digital Guardian. I've analyzed your vault and found **2 weak passwords** that you should update. How can I help you today?", metadata: {}, created_at: MOCK_DATE }
  ],
  recommendations: [
    { id: "r1", user_id: "demo", title: "Update Weak Passwords", description: "You have 2 passwords that are vulnerable to brute force.", category: "password", priority: "high", action_url: "/app/passwords", is_resolved: false, created_at: MOCK_YESTERDAY }
  ],
  loading: false,
  loaded: false,
  faceEmbeddings: [],
  threatEvents: MOCK_SECURITY_EVENTS,
  scoreLogs: [],

  loadAll: async (userId) => {
    set({ loading: true });
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    set({ loading: false, loaded: true, threatEvents: MOCK_SECURITY_EVENTS });
  },

  subscribe: (userId) => {
    return () => {};
  },

  addChatMessage: (msg) => set({ chatMessages: [...get().chatMessages, msg] }),
  addSecurityEvent: (event) => {
    const newEvents = [event, ...get().securityEvents];
    set({ securityEvents: newEvents });
    setItemEncrypted("securityEvents", newEvents).catch(console.error);
  },
  addIntruderEvent: (event) => {
    const isOnline = navigator.onLine;
    const finalEvent = {
      ...event,
      sync_status: isOnline ? ("synced" as const) : ("pending" as const),
      email_status: isOnline ? ("sent" as const) : ("pending" as const),
    };
    const newEvents = [finalEvent, ...get().intruderEvents];
    set({ intruderEvents: newEvents });
    setItemEncrypted("intruderEvents", newEvents).catch(console.error);
  },
  syncOfflineData: async () => {
    if (!navigator.onLine) return;
    let modified = false;
    const currentEvents = get().intruderEvents.map((ev) => {
      if (ev.sync_status === "pending" || ev.email_status === "pending") {
        modified = true;
        return {
          ...ev,
          sync_status: "synced" as const,
          email_status: "sent" as const,
        };
      }
      return ev;
    });
    if (modified) {
      set({ intruderEvents: currentEvents });
      await setItemEncrypted("intruderEvents", currentEvents);
      // Simulate pushing notifications when syncing offline data
      console.log("[Sync] Synced offline data and dispatched pending emails.");
    }
  },
}));

window.addEventListener("online", () => {
  useDataStore.getState().syncOfflineData();
});

