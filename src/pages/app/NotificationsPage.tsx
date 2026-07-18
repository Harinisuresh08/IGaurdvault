import { useMemo } from "react";
import { Bell, CircleCheck as CheckCircle2, TriangleAlert as AlertTriangle, Info, Shield, X } from "lucide-react";
import { useDataStore } from "@/stores/dataStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Badge, EmptyState } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";
import type { AppNotification } from "@/types";

const TYPE_ICONS: Record<string, typeof Bell> = {
  info: Info, warning: AlertTriangle, danger: Shield, success: CheckCircle2,
};
const TYPE_COLORS: Record<string, string> = {
  info: "#00E5FF", warning: "#F59E0B", danger: "#EF4444", success: "#22C55E",
};

export default function NotificationsPage() {
  const { notifications } = useDataStore();
  const { user } = useAuthStore();

  const unread = useMemo(() => notifications.filter((n) => !n.is_read), [notifications]);

  const markRead = async (notif: AppNotification) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <PageHeader title="Notifications" subtitle={`${unread.length} unread notification${unread.length !== 1 ? "s" : ""}`} action={unread.length > 0 ? <button onClick={markAllRead} className="text-xs text-accent hover:underline">Mark all read</button> : undefined} />

      {notifications.length === 0 ? (
        <EmptyState icon={<Bell className="w-12 h-12" />} title="No notifications" message="Security alerts and AI recommendations will appear here." />
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const Icon = TYPE_ICONS[notif.type] ?? Bell;
            const color = TYPE_COLORS[notif.type] ?? "#00E5FF";
            return (
              <Card key={notif.id} className={notif.is_read ? "opacity-60" : ""}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}22` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{notif.title}</p>
                      {!notif.is_read && <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />}
                    </div>
                    {notif.body && <p className="text-xs text-muted mt-1">{notif.body}</p>}
                    <span className="text-xs text-muted-faint mt-1 block">{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}</span>
                  </div>
                  {!notif.is_read && (
                    <button onClick={() => markRead(notif)} className="text-muted hover:text-white p-1 flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
