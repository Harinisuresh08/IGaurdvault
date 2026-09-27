import { Shield, Lock } from "lucide-react";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-base-bg animate-fade-in">
      <div className="relative">
        <div className="absolute inset-0 blur-3xl bg-accent/20 rounded-full animate-pulse-slow" />
        <div className="relative w-24 h-24 rounded-3xl gradient-accent flex items-center justify-center shadow-glow-lg animate-scale-in">
          <Shield className="w-12 h-12 text-white" strokeWidth={2.5} />
        </div>
      </div>
      <div className="mt-8 text-center animate-slide-up">
        <h1 className="text-3xl font-bold gradient-text">iGuard One</h1>
        <p className="text-sm text-muted mt-2">AI Personal Digital Guardian</p>
      </div>
      <div className="mt-6 flex items-center gap-2 text-xs text-muted-faint animate-fade-in">
        <Lock className="w-3 h-3" />
        <span>Protecting Your Digital Life with AI</span>
      </div>
      <div className="absolute bottom-8 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-accent animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
