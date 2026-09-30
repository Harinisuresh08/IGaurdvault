import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, User, Shield, ArrowRight, CircleAlert as AlertCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Field } from "@/components/auth/Field";
import { Button } from "@/components/ui";

export default function RegisterPage() {
  const navigate = useNavigate();
  const signUp = useAuthStore((s) => s.signUp);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error: signUpError } = await signUp(email, password, fullName);
    if (signUpError) {
      setError(signUpError);
      setLoading(false);
      return;
    }
    navigate("/auth/face-verify");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-bg px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl gradient-accent items-center justify-center shadow-glow mb-4">
            <Shield className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-sm text-muted mt-1">Set up your AI Digital Guardian</p>
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
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              icon={<User className="w-4 h-4" />}
            />
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
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              icon={<Lock className="w-4 h-4" />}
            />
            <Field
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              icon={<Lock className="w-4 h-4" />}
            />
            <Button type="submit" size="lg" className="w-full" loading={loading} icon={!loading ? <ArrowRight className="w-4 h-4" /> : undefined}>
              Create Account
            </Button>
          </form>
          <p className="text-center text-sm text-muted mt-4">
            Already have an account?{" "}
            <Link to="/auth/login" className="text-accent hover:underline font-medium">Sign in</Link>
          </p>
        </div>
        <p className="text-center text-xs text-muted-faint mt-6">
          By creating an account, your data is protected with end-to-end AES-256 encryption.
        </p>
      </div>
    </div>
  );
}
