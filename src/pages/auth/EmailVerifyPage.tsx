import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { MailCheck, ShieldCheck } from "lucide-react";

export default function EmailVerifyPage() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();

  const continueToApp = () => navigate("/app");

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <AuthShell
      title="Verify your email"
      subtitle="One last step to activate your iGuard AI account."
    >
      <div className="space-y-5">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent shadow-glow">
            <MailCheck size={32} />
          </div>
          <p className="text-sm text-muted">
            We sent a verification email to
          </p>
          <p className="mt-1 font-mono text-sm font-medium text-white">
            {user?.email ?? "your inbox"}
          </p>
          <p className="mt-3 text-sm text-muted">
            Click the link in the email to confirm your account. You can
            continue exploring the app in the meantime.
          </p>
        </div>

        <div className="rounded-xl border border-base-border bg-base-surface/60 p-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <ShieldCheck size={16} className="text-success" />
            Your data is encrypted end-to-end.
          </div>
        </div>

        <Button size="lg" className="w-full" onClick={continueToApp}>
          Continue to Dashboard
        </Button>
        <button
          onClick={handleSignOut}
          className="w-full text-center text-sm text-muted hover:text-white"
        >
          Sign out and use a different account
        </button>
        <p className="text-center text-xs text-muted-faint">
          Didn't get the email?{" "}
          <Link to="/login" className="text-accent hover:underline">
            Try signing in again
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
