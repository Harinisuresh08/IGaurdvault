import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Shield, ArrowRight, CircleAlert as AlertCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Field } from "@/components/auth/Field";
import { Button } from "@/components/ui";
import { logSecurityEvent, getDeviceInfo } from "@/lib/securityService";

export default function LoginPage() {
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
      return;
    }
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      logSecurityEvent({
        user_id: userId, type: "login_success", severity: "info",
        title: "Login Successful", description: `Signed in from ${getDeviceInfo()}`,
        device_info: getDeviceInfo(),
      });
    }
    navigate("/auth/face-verify");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-bg px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl gradient-accent items-center justify-center shadow-glow mb-4">
            <Shield className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-sm text-muted mt-1">Sign in to your AI Digital Guardian</p>
        </div>

        <div className="glass rounded-2xl p-6">
          {error && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-danger-soft border border-danger/30 text-sm text-danger">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              icon={<Mail className="w-4 h-4" />}
            />
            <Field
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              icon={<Lock className="w-4 h-4" />}
            />
            <Button type="submit" size="lg" className="w-full" loading={loading} icon={!loading ? <ArrowRight className="w-4 h-4" /> : undefined}>
              Sign In
            </Button>
          </form>
          <p className="text-center text-sm text-muted mt-4">
            Don't have an account?{" "}
            <Link to="/auth/register" className="text-accent hover:underline font-medium">Create one</Link>
          </p>
        </div>
        <p className="text-center text-xs text-muted-faint mt-6">
          New here? <Link to="/onboarding" className="hover:text-muted">Take the tour</Link>
        </p>
      </div>
    </div>
  );
}
