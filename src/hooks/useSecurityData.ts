import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";

/** Loads the user's security data and sets up realtime subscriptions once
 * the authenticated session is ready. Returns the store state. */
export function useSecurityData() {
  const user = useAuthStore((s) => s.user);
  const loadAll = useDataStore((s) => s.loadAll);
  const subscribe = useDataStore((s) => s.subscribe);

  useEffect(() => {
    if (!user) return;
    loadAll(user.id);
    const unsub = subscribe(user.id);
    return unsub;
  }, [user, loadAll, subscribe]);

  return useDataStore();
}
