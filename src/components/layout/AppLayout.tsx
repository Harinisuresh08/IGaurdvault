import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, LayoutDashboard, Lock, KeyRound, Brain, TriangleAlert as AlertTriangle, Bot, FileText, Settings, User, LogOut, Bell, Menu, X, Clock, Info, ScanFace } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import { lockVault, isVaultUnlocked } from "@/lib/crypto";
import { logSecurityEvent, getDeviceInfo } from "@/lib/securityService";
import { Badge } from "@/components/ui";

const navItems = [
  { to: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/app/vault", icon: Lock, label: "Secure Vault" },
  { to: "/app/passwords", icon: KeyRound, label: "Passwords" },
  { to: "/app/security", icon: Brain, label: "Security Center" },
  { to: "/app/intruders", icon: AlertTriangle, label: "Intruder Center" },
  { to: "/app/face/register", icon: ScanFace, label: "Face Register" },
  { to: "/app/face/recognize", icon: ScanFace, label: "Face Recognize" },
  { to: "/app/assistant", icon: Bot, label: "AI Assistant" },
  { to: "/app/timeline", icon: Clock, label: "Timeline" },
  { to: "/app/reports", icon: FileText, label: "Reports" },
];

const bottomNav = [
  { to: "/app/notifications", icon: Bell, label: "Notifications" },
  { to: "/app/profile", icon: User, label: "Profile" },
  { to: "/app/settings", icon: Settings, label: "Settings" },
  { to: "/app/about", icon: Info, label: "About" },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut, user } = useAuthStore();
  const notifications = useDataStore((s) => s.notifications);
  const intruders = useDataStore((s) => s.intruderEvents);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [vaultLocked, setVaultLocked] = useState(!isVaultUnlocked());

  useEffect(() => {
    setVaultLocked(!isVaultUnlocked());
  }, [location.pathname]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const newIntruders = intruders.filter((i) => i.status === "new").length;

  const handleSignOut = async () => {
    if (user) {
      logSecurityEvent_local(user.id);
    }
    lockVault();
    await signOut();
    navigate("/auth/login");
  };

  function logSecurityEvent_local(userId: string) {
    logSecurityEvent({
      user_id: userId, type: "login_failure" as never, severity: "info",
      title: "Signed Out", description: `User signed out from ${getDeviceInfo()}`,
    });
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-base-border">
        <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shadow-glow">
          <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white">iGuard One</h1>
          <p className="text-xs text-muted">AI Digital Guardian</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-accent-soft text-accent border border-accent/30"
                  : "text-muted-light hover:text-white hover:bg-base-elevated"
              }`
            }
          >
            <item.icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
            <span>{item.label}</span>
            {item.to === "/app/intruders" && newIntruders > 0 && (
              <span className="ml-auto bg-danger text-white text-xs px-1.5 py-0.5 rounded-full" style={{ fontSize: 10 }}>{newIntruders}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-base-border space-y-1">
        {bottomNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-accent-soft text-accent border border-accent/30"
                  : "text-muted-light hover:text-white hover:bg-base-elevated"
              }`
            }
          >
            <item.icon style={{ width: 18, height: 18 }} />
            <span>{item.label}</span>
            {item.to === "/app/notifications" && unreadCount > 0 && (
              <span className="ml-auto bg-accent text-white text-xs px-1.5 py-0.5 rounded-full" style={{ fontSize: 10 }}>{unreadCount}</span>
            )}
          </NavLink>
        ))}
      </div>

      <div className="px-3 pb-4">
        <div className="glass rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-base-elevated flex items-center justify-center text-sm font-bold text-accent">
            {profile?.display_name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.display_name ?? "User"}</p>
            <p className="text-xs text-muted truncate">{user?.email}</p>
          </div>
          <button onClick={handleSignOut} className="text-muted hover:text-danger transition-colors p-1.5">
            <LogOut style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-base-bg overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 glass-strong border-r border-base-border">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-64 glass-strong border-r border-base-border lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 glass-strong border-b border-base-border">
          <button onClick={() => setMobileOpen(true)} className="text-muted-light hover:text-white">
            <Menu style={{ width: 24, height: 24 }} />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            <span className="text-sm font-bold text-white">iGuard One</span>
          </div>
          {vaultLocked ? (
            <Badge color="#F59E0B">Locked</Badge>
          ) : (
            <Badge color="#22C55E">Unlocked</Badge>
          )}
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
