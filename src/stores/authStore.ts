import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { UserProfile, UserSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";

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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null, profile: null, session: null, loading: true, initialized: false,

  setSession: (session) => {
    if (session) {
      const payload = JSON.parse(atob(session.access_token.split(".")[1]));
      set({ session, user: { id: payload.sub, email: payload.email } });
    } else {
      set({ session: null, user: null, profile: null });
    }
  },

  setProfile: (profile) => set({ profile }),

  loadProfile: async (userId) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) { console.error("Failed to load profile:", error.message); return; }
    if (!data) {
      const { data: newProfile, error: createError } = await supabase.from("profiles").insert({
        id: userId, display_name: get().user?.email?.split("@")[0] ?? "User",
        email: get().user?.email ?? "", settings: DEFAULT_SETTINGS as unknown as Record<string, unknown>,
        face_registered: false,
      }).select().single();
      if (createError) { console.error("Failed to create profile:", createError.message); return; }
      set({ profile: newProfile as UserProfile });
    } else {
      set({ profile: data as UserProfile });
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.session) { get().setSession(data.session); await get().loadProfile(data.user!.id); }
    return { error: null };
  },

  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: fullName } } });
    if (error) return { error: error.message };
    if (data.session) { get().setSession(data.session); await get().loadProfile(data.user!.id); }
    return { error: null };
  },

  signOut: async () => { await supabase.auth.signOut(); set({ user: null, profile: null, session: null }); },

  updateSettings: async (settings) => {
    const profile = get().profile;
    if (!profile) return;
    const merged = { ...profile.settings, ...settings };
    set({ profile: { ...profile, settings: merged } });
    await supabase.from("profiles").update({ settings: merged as unknown as Record<string, unknown>, updated_at: new Date().toISOString() }).eq("id", profile.id);
  },

  updateProfile: async (patch) => {
    const profile = get().profile;
    if (!profile) return;
    const merged = { ...profile, ...patch };
    set({ profile: merged });
    const { id, ...updateFields } = patch;
    void id;
    await supabase.from("profiles").update({ ...updateFields, updated_at: new Date().toISOString() }).eq("id", profile.id);
  },
}));

export function initAuth() {
  supabase.auth.getSession().then(({ data }) => {
    useAuthStore.getState().setSession(data.session);
    useAuthStore.setState({ loading: false, initialized: true });
    if (data.session?.user) useAuthStore.getState().loadProfile(data.session.user.id);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    (async () => {
      useAuthStore.getState().setSession(session);
      if (session?.user) await useAuthStore.getState().loadProfile(session.user.id);
    })();
  });
}
