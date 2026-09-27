import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field } from "@/components/auth/Field";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a secure link to reset your password."
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-lg font-semibold text-white">Check your inbox</h3>
          <p className="text-sm text-muted">
            We've sent a password reset link to{" "}
            <span className="font-medium text-accent">{email}</span>. The link
            expires in one hour.
          </p>
          <Link to="/login">
            <Button variant="outline" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-base-border bg-base-surface px-3.5 py-2.5 text-sm text-muted">
            <Mail size={16} className="text-accent" />
            A recovery email will be sent securely.
          </div>
          <Field
            label="Email"
            icon="mail"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            error={error ?? undefined}
          />
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Sending link…" : "Send Reset Link"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{" "}
        <Link
          to="/login"
          className="font-medium text-accent hover:text-accent-400"
        >
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
