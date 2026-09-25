import { create } from "zustand";
import type { UserProfile, UserSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { setItemEncrypted, getItemDecrypted } from "@/lib/secureStorage";

interface AuthState {
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
  session: { access_token: string } | null;
  loading: boolean;
  initialized: boolean;
  setSession: (session: { access_token: string } | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  loadProfile: (userId: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
}

const MOCK_USER_ID = "demo-user-123";

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null, profile: null, session: null, loading: false, initialized: true,

  setSession: (session) => {
    if (session) {
      set({ session, user: { id: MOCK_USER_ID, email: "demo@iguard.one" } });
    } else {
      set({ session: null, user: null, profile: null });
    }
  },

  setProfile: (profile) => set({ profile }),

  loadProfile: async (userId) => {
    let storedProfile = await getItemDecrypted<UserProfile>(`profile_${userId}`);
    if (!storedProfile) {
      // Create a mock face embedding array (128 dimensions, typical for face embeddings)
      const mockFaceEmbedding = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
      
      storedProfile = {
        id: userId,
        email: "demo@iguard.one",
        display_name: "Demo User",
        avatar_url: null,
        phone: null,
        emergency_contact_name: null,
        emergency_contact_email: null,
        emergency_contact_phone: null,
        settings: DEFAULT_SETTINGS,
        face_registered: true,
        face_embedding: mockFaceEmbedding,
        pin_hash: "1234",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await setItemEncrypted(`profile_${userId}`, storedProfile);
    }
    set({ profile: storedProfile });
  },

  signIn: async (email, password) => {
    const session = { access_token: "demo-token-abc" };
    get().setSession(session);
    await get().loadProfile(MOCK_USER_ID);
    return { error: null };
  },

  signUp: async (email, password, fullName) => {
    const session = { access_token: "demo-token-abc" };
    get().setSession(session);
    await get().loadProfile(MOCK_USER_ID);
    return { error: null };
  },

  signOut: async () => {
    set({ user: null, profile: null, session: null });
  },

  updateSettings: async (settings) => {
    const profile = get().profile;
    if (!profile) return;
    const merged = { ...profile.settings, ...settings };
    set({ profile: { ...profile, settings: merged } });
  },

  updateProfile: async (patch) => {
    const profile = get().profile;
    if (!profile) return;
    const merged = { ...profile, ...patch };
    set({ profile: merged });
    await setItemEncrypted(`profile_${profile.id}`, merged);
  },
}));

export function initAuth() {
  // In demo mode, we just start initialized with no session (user must click login)
  useAuthStore.setState({ loading: false, initialized: true });
}
