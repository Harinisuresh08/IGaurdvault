import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type {
  SecurityEvent,
  IntruderEvent,
  VaultItem,
  VaultFolder,
  PasswordEntry,
  TrustedDevice,
  TrustedLocation,
  BehaviorSample,
  AppNotification,
  ChatMessage,
  Recommendation,
} from "@/types";

interface DataState {
  securityEvents: SecurityEvent[];
  threatEvents: SecurityEvent[];
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
  scoreLogs: any[];
  faceEmbeddings: any[];
  loading: boolean;
  loaded: boolean;
  loadAll: (userId: string) => Promise<void>;
  subscribe: (userId: string) => (() => void) | null;
}

export const useDataStore = create<DataState>((set, get) => ({
  securityEvents: [],
  threatEvents: [],
  intruderEvents: [],
  vaultFolders: [],
  vaultItems: [],
  passwordEntries: [],
  trustedDevices: [],
  trustedLocations: [],
  behaviorSamples: [],
  notifications: [],
  chatMessages: [],
  recommendations: [],
  scoreLogs: [],
  faceEmbeddings: [],
  loading: false,
  loaded: true,

  loadAll: async (userId) => {
    set({ loading: true });

    const [
      events,
      intruders,
      folders,
      items,
      passwords,
      devices,
      locations,
      behavior,
      notifs,
      chat,
      recs,
      faceEmbs,
    ] = await Promise.all([
      supabase
        .from("threat_events")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),

      supabase
        .from("intruder_events")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),

      supabase
        .from("vault_folders")
        .select("*")
        .eq("user_id", userId)
        .order("name"),

      supabase
        .from("vault_items")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),

      supabase
        .from("password_entries")
        .select("*")
        .eq("user_id", userId)
        .order("title"),

      supabase
        .from("trusted_devices")
        .select("*")
        .eq("user_id", userId)
        .order("device_name"),

      supabase
        .from("trusted_locations")
        .select("*")
        .eq("user_id", userId)
        .order("label"),

      supabase
        .from("behavior_samples")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200),

      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),

      supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),

      supabase
        .from("recommendations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),

      supabase
        .from("face_embeddings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    set({
      securityEvents: events.data ?? [],
      threatEvents: events.data ?? [],
      intruderEvents: intruders.data ?? [],
      vaultFolders: folders.data ?? [],
      vaultItems: items.data ?? [],
      passwordEntries: passwords.data ?? [],
      trustedDevices: devices.data ?? [],
      trustedLocations: locations.data ?? [],
      behaviorSamples: behavior.data ?? [],
      notifications: notifs.data ?? [],
      chatMessages: (chat.data ?? []).reverse() as ChatMessage[],
      recommendations: recs.data ?? [],
      faceEmbeddings: faceEmbs.data ?? [],
      loading: false,
      loaded: true,
    });
  },

  subscribe: (userId) => {
    const channelName = `iguard-realtime-${userId}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "threat_events",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          set({
            securityEvents: [
              payload.new as SecurityEvent,
              ...get().securityEvents,
            ].slice(0, 100),
          });
        }
      )

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "intruder_events",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          set({
            intruderEvents: [
              payload.new as IntruderEvent,
              ...get().intruderEvents,
            ].slice(0, 50),
          });
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vault_folders",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const folders = get().vaultFolders;
          if (payload.eventType === "INSERT") {
            set({ vaultFolders: [...folders, payload.new as VaultFolder].sort((a, b) => a.name.localeCompare(b.name)) });
          } else if (payload.eventType === "UPDATE") {
            set({ vaultFolders: folders.map((f) => f.id === (payload.new as VaultFolder).id ? (payload.new as VaultFolder) : f) });
          } else if (payload.eventType === "DELETE") {
            set({ vaultFolders: folders.filter((f) => f.id !== (payload.old as VaultFolder).id) });
          }
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vault_items",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const items = get().vaultItems;

          if (payload.eventType === "INSERT") {
            set({
              vaultItems: [payload.new as VaultItem, ...items],
            });
          } else if (payload.eventType === "UPDATE") {
            set({
              vaultItems: items.map((item) =>
                item.id === (payload.new as VaultItem).id
                  ? (payload.new as VaultItem)
                  : item
              ),
            });
          } else if (payload.eventType === "DELETE") {
            set({
              vaultItems: items.filter(
                (item) => item.id !== (payload.old as VaultItem).id
              ),
            });
          }
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "password_entries",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const passwords = get().passwordEntries;

          if (payload.eventType === "INSERT") {
            set({
              passwordEntries: [
                payload.new as PasswordEntry,
                ...passwords,
              ],
            });
          } else if (payload.eventType === "UPDATE") {
            set({
              passwordEntries: passwords.map((password) =>
                password.id === (payload.new as PasswordEntry).id
                  ? (payload.new as PasswordEntry)
                  : password
              ),
            });
          } else if (payload.eventType === "DELETE") {
            set({
              passwordEntries: passwords.filter(
                (password) =>
                  password.id !== (payload.old as PasswordEntry).id
              ),
            });
          }
        }
      )

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          set({
            notifications: [
              payload.new as AppNotification,
              ...get().notifications,
            ].slice(0, 50),
          });
        }
      )

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          set({
            chatMessages: [
              ...get().chatMessages,
              payload.new as ChatMessage,
            ].slice(-100),
          });
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recommendations",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const recommendations = get().recommendations;

          if (payload.eventType === "INSERT") {
            set({
              recommendations: [
                payload.new as Recommendation,
                ...recommendations,
              ].slice(0, 50),
            });
          } else if (payload.eventType === "UPDATE") {
            set({
              recommendations: recommendations.map((recommendation) =>
                recommendation.id ===
                (payload.new as Recommendation).id
                  ? (payload.new as Recommendation)
                  : recommendation
              ),
            });
          }
        }
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));