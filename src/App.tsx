import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore, initAuth } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import SplashScreen from "@/pages/auth/SplashScreen";
import OnboardingScreen from "@/pages/auth/OnboardingScreen";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import AppLayout from "@/components/layout/AppLayout";
import FaceVerifyPage from "@/pages/auth/FaceVerifyPage";
import { FACE_VERIFIED_KEY } from "@/pages/auth/FaceVerifyPage";
import DashboardPage from "@/pages/app/DashboardPage";
import VaultPage from "@/pages/app/VaultPage";
import VaultItemPage from "@/pages/app/VaultItemPage";
import PasswordManagerPage from "@/pages/app/PasswordManagerPage";
import SecurityCenterPage from "@/pages/app/SecurityCenterPage";
import IntruderCenterPage from "@/pages/app/IntruderCenterPage";
import AIAssistantPage from "@/pages/app/AIAssistantPage";
import ReportsPage from "@/pages/app/ReportsPage";
import SettingsPage from "@/pages/app/SettingsPage";
import ProfilePage from "@/pages/app/ProfilePage";
import AboutPage from "@/pages/app/AboutPage";
import TimelinePage from "@/pages/app/TimelinePage";
import FaceRegisterPage from "@/pages/app/FaceRegisterPage";
import FaceRecognizePage from "@/pages/app/FaceRecognizePage";
import NotificationsPage from "@/pages/app/NotificationsPage";
import { lockVault } from "@/lib/crypto";
import { logSecurityEvent, getDeviceInfo } from "@/lib/securityService";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, initialized } = useAuthStore();
  const location = useLocation();

  if (!initialized || loading) return <SplashScreen />;
  if (!session) return <Navigate to="/auth/login" state={{ from: location }} replace />;

  // Require face verification every session
  if (!sessionStorage.getItem(FACE_VERIFIED_KEY)) {
    return <Navigate to="/auth/face-verify" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { session, user, profile } = useAuthStore();
  const loadAll = useDataStore((s) => s.loadAll);
  const subscribe = useDataStore((s) => s.subscribe);
  const [unsub, setUnsub] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (session && user) {
      loadAll(user.id);
      if (!unsub) {
        const u = subscribe(user.id);
        setUnsub(() => u);
      }
      if (profile && !profile.face_registered) {
        logSecurityEvent({
          user_id: user.id, type: "login_success", severity: "info",
          title: "Welcome to iGuard One", description: `Account ready. Face registration pending. Device: ${getDeviceInfo()}`,
          device_info: getDeviceInfo(),
        });
      }
    } else if (!session) {
      if (unsub) { unsub(); setUnsub(null); }
      lockVault();
    }
  }, [session, user, profile, loadAll, subscribe, unsub]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/auth/login" replace />} />
      <Route path="/onboarding" element={<OnboardingScreen />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/auth/face-verify" element={<FaceVerifyPage />} />
      <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="vault" element={<VaultPage />} />
        <Route path="vault/:id" element={<VaultItemPage />} />
        <Route path="passwords" element={<PasswordManagerPage />} />
        <Route path="security" element={<SecurityCenterPage />} />
        <Route path="intruders" element={<IntruderCenterPage />} />
        <Route path="assistant" element={<AIAssistantPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="face/register" element={<FaceRegisterPage />} />
        <Route path="face/recognize" element={<FaceRecognizePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="about" element={<AboutPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => { initAuth(); }, []);
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
