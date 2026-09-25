import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, LayoutDashboard, Lock, KeyRound, Brain,
  TriangleAlert as AlertTriangle, Bot, FileText, Settings, User,
  LogOut, Bell, Menu, X, Clock, Info, BarChart3, ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import { lockVault, isVaultUnlocked } from "@/lib/crypto";
import { logSecurityEvent, getDeviceInfo } from "@/lib/securityService";
import { computeSecurityScore } from "@/lib/securityEngine";
import { detectDuplicates } from "@/lib/vaultService";
import { ProgressRing } from "@/components/ui";

/* ── Nav items ── */
const navItems = [
  { to: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard", color: "#00E5FF" },
  { to: "/app/vault", icon: Lock, label: "Secure Vault", color: "#3B82F6" },
  { to: "/app/passwords", icon: KeyRound, label: "Passwords", color: "#8B5CF6" },
  { to: "/app/security", icon: Brain, label: "Security Center", color: "#F59E0B" },
  { to: "/app/intruders", icon: AlertTriangle, label: "Intruder Center", color: "#EF4444" },
  { to: "/app/assistant", icon: Bot, label: "AI Assistant", color: "#22C55E" },
  { to: "/app/timeline", icon: Clock, label: "Timeline", color: "#64748B" },
  { to: "/app/analytics", icon: BarChart3, label: "Analytics", color: "#06B6D4" },
  { to: "/app/reports", icon: FileText, label: "Reports", color: "#94A3B8" },
];

const bottomNavItems = [
  { to: "/app/dashboard", icon: LayoutDashboard, label: "Home" },
  { to: "/app/vault", icon: Lock, label: "Vault" },
  { to: "/app/security", icon: Brain, label: "Security" },
  { to: "/app/intruders", icon: AlertTriangle, label: "Intruders" },
  { to: "/app/assistant", icon: Bot, label: "AI" },
];

const bottomNavSettings = [
  { to: "/app/notifications", icon: Bell, label: "Notifications" },
  { to: "/app/profile", icon: User, label: "Profile" },
  { to: "/app/settings", icon: Settings, label: "Settings" },
  { to: "/app/about", icon: Info, label: "About" },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut, user } = useAuthStore();
  const { notifications, intruderEvents, vaultItems, passwordEntries, behaviorSamples } = useDataStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [vaultLocked, setVaultLocked] = useState(!isVaultUnlocked());
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setVaultLocked(!isVaultUnlocked());
  }, [location.pathname]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const newIntruders = intruderEvents.filter((i) => i.status === "new").length;

  // Mini security score for sidebar
  const miniScore = (() => {
    const weak = passwordEntries.filter((p) => p.is_weak);
    const dups = detectDuplicates(passwordEntries);
    const dupCount = passwordEntries.filter((p) => dups.has(p.id)).length;
    const recentIntruders = intruderEvents.filter((i) =>
      (Date.now() - new Date(i.created_at).getTime()) / 86400000 <= 7
    ).length;
    const behaviorAnomaly = behaviorSamples.length > 5
      ? behaviorSamples.filter((s) => s.anomaly_label === "anomaly").length / behaviorSamples.length
      : 0;
    const s = computeSecurityScore({
      faceMatched: true, faceConfidence: 0.95, isTrustedLocation: true, isTrustedDevice: true,
      failedAttempts: 0, hasWeakPasswords: weak.length > 0, hasDuplicatePasswords: dupCount > 0,
      recentIntruders, backupCompletedDays: null, behaviorAnomaly, hourOfDay: new Date().getHours(),
    });
    return s;
  })();

  const scoreColor = miniScore.score >= 80 ? "#22C55E" : miniScore.score >= 60 ? "#F59E0B" : "#EF4444";

  const handleSignOut = async () => {
    if (user) {
      logSecurityEvent({
        user_id: user.id, type: "login_failure" as never, severity: "info",
        title: "Signed Out", description: `User signed out from ${getDeviceInfo()}`,
      });
    }
    lockVault();
    await signOut();
    navigate("/auth/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-base-border">
        <div className="relative w-10 h-10">
          <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shadow-glow animate-glow-pulse">
            <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
        </div>
        <div>
          <h1 className="text-sm font-bold gradient-text">iGuard One</h1>
          <p className="text-[10px] text-muted">AI Digital Guardian</p>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto lg:hidden text-muted hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mini Security Score */}
      <div className="px-4 py-3 border-b border-base-border">
        <div className="glass rounded-xl p-3 flex items-center gap-3">
          <ProgressRing value={miniScore.score} size={44} stroke={4} color={scoreColor} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted">Security Score</p>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white">{miniScore.score}/100</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: `${scoreColor}1A`, color: scoreColor }}
              >
                {miniScore.level}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-0.5">
        <p className="text-[10px] text-muted-faint uppercase tracking-widest px-3 mb-2 mt-1">Navigation</p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                ? "nav-active"
                : "text-muted-light hover:text-white hover:bg-base-elevated"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                  style={{
                    background: isActive ? `${item.color}22` : "transparent",
                  }}
                >
                  <item.icon
                    className="w-4 h-4 transition-all"
                    style={{ color: isActive ? item.color : undefined }}
                  />
                </div>
                <span className="flex-1">{item.label}</span>
                {item.to === "/app/intruders" && newIntruders > 0 && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold text-white"
                    style={{ background: "#EF4444" }}
                  >
                    {newIntruders}
                  </span>
                )}
                {item.to === "/app/notifications" && unreadCount > 0 && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold text-white"
                    style={{ background: "#00E5FF" }}
                  >
                    {unreadCount}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3 h-3 text-accent flex-shrink-0" />}
              </>
            )}
          </NavLink>
        ))}

        <p className="text-[10px] text-muted-faint uppercase tracking-widest px-3 mb-2 mt-4">Account</p>
        {bottomNavSettings.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                ? "nav-active"
                : "text-muted-light hover:text-white hover:bg-base-elevated"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="flex-1">{item.label}</span>
                {item.to === "/app/notifications" && unreadCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold text-white bg-accent">
                    {unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Profile footer */}
      <div className="px-3 pb-4 border-t border-base-border pt-3">
        <div className="glass rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full gradient-accent flex items-center justify-center text-sm font-bold text-white shadow-glow flex-shrink-0">
            {profile?.display_name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{profile?.display_name ?? "User"}</p>
            <p className="text-[10px] text-muted truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-muted hover:text-danger transition-colors p-1.5 rounded-lg hover:bg-danger/10"
            title="Sign Out"
          >
            <LogOut style={{ width: 15, height: 15 }} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen mesh-bg overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col flex-shrink-0 glass-strong border-r border-base-border">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 glass-strong border-r border-base-border lg:hidden overflow-y-auto no-scrollbar"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 glass-strong border-b border-base-border flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-xl bg-base-elevated flex items-center justify-center text-muted-light hover:text-white transition-colors"
          >
            <Menu style={{ width: 20, height: 20 }} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg gradient-accent flex items-center justify-center shadow-glow">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold gradient-text">iGuard One</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="text-[10px] px-2 py-1 rounded-full font-medium"
              style={{
                background: vaultLocked ? "#F59E0B1A" : "#22C55E1A",
                color: vaultLocked ? "#F59E0B" : "#22C55E",
                border: `1px solid ${vaultLocked ? "#F59E0B40" : "#22C55E40"}`,
              }}
            >
              {vaultLocked ? "🔒 Locked" : "🔓 Unlocked"}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-20 lg:pb-0">
          <Outlet />
        </main>

        {/* Mobile bottom navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 glass-strong border-t border-base-border px-2 py-2">
          <div className="flex items-center justify-around">
            {bottomNavItems.map((item) => {
              const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
              const isIntruder = item.to === "/app/intruders";
              return (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className={`bottom-nav-item ${isActive ? "active" : "text-muted"}`}
                >
                  <div className="relative">
                    <item.icon
                      className="transition-all duration-200"
                      style={{ width: 22, height: 22, color: isActive ? "#00E5FF" : undefined }}
                    />
                    {isIntruder && newIntruders > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                        {newIntruders}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium transition-colors">{item.label}</span>
                </button>
              );
            })}
            {/* More menu button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="bottom-nav-item text-muted"
            >
              <Menu style={{ width: 22, height: 22 }} />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
