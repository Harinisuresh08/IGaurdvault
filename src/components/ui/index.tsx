import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { Loader as Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "gradient-accent text-white shadow-glow hover:shadow-glow-lg",
  secondary: "bg-base-elevated text-white hover:bg-base-hover border border-base-border",
  ghost: "text-muted-light hover:text-white hover:bg-base-elevated",
  danger: "gradient-danger text-white shadow-glow-danger",
  outline: "border border-accent text-accent hover:bg-accent-soft",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, icon, children, className = "", disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = "", ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-muted-light mb-1.5">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">{icon}</div>}
        <input
          ref={ref}
          className={`w-full bg-base-surface border border-base-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-muted-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all ${icon ? "pl-10" : ""} ${error ? "border-danger" : ""} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  ),
);
Input.displayName = "Input";

export function Card({ children, className = "", glow, onClick }: { children: ReactNode; className?: string; glow?: boolean; onClick?: () => void }) {
  return (
    <div className={`glass rounded-2xl p-5 ${glow ? "shadow-glow" : ""} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

export function Badge({ children, color = "#00E5FF", className = "" }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {children}
    </span>
  );
}

export function Spinner({ size = 24, className = "" }: { size?: number; className?: string }) {
  return <Loader2 className={`animate-spin text-accent ${className}`} style={{ width: size, height: size }} />;
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-light mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
}

export function StatCard({ title, label, value, change, icon, color = "#00E5FF", accent, subtitle }: {
  title?: string; label?: string; value: string | number; change?: string; icon?: ReactNode; color?: string; accent?: string; subtitle?: string;
}) {
  const displayTitle = title ?? label ?? "";
  const displayColor = color ?? accent ?? "#00E5FF";
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-light">{displayTitle}</p>
          <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
          {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
          {change && <p className="text-xs text-accent mt-1">{change}</p>}
        </div>
        {icon && (
          <div className="p-2.5 rounded-xl text-white" style={{ background: `${displayColor}22`, color: displayColor }}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export function EmptyState({ icon, title, message, action }: { icon?: ReactNode; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-muted mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      {message && <p className="text-sm text-muted max-w-md">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2"
    >
      <div className={`w-10 h-5.5 rounded-full transition-all relative ${checked ? "gradient-accent" : "bg-base-border"}`} style={{ width: 40, height: 22 }}>
        <div
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-md"
          style={{ left: checked ? 18 : 2 }}
        />
      </div>
      {label && <span className="text-sm text-muted-light">{label}</span>}
    </button>
  );
}

export function ProgressRing({ value, size = 120, stroke = 8, color = "#00E5FF", label, sublabel }: {
  value: number; size?: number; stroke?: number; color?: string; label?: string; sublabel?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1E293B" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease", filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && <span className="text-2xl font-bold text-white">{label}</span>}
        {sublabel && <span className="text-xs text-muted">{sublabel}</span>}
      </div>
    </div>
  );
}

export function Modal({ open, onClose, children, title, size = "md" }: {
  open: boolean; onClose: () => void; children: ReactNode; title?: string; size?: "sm" | "md" | "lg" | "xl";
}) {
  if (!open) return null;
  const sizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className={`relative glass-strong rounded-2xl w-full ${sizes[size]} max-h-[90vh] overflow-y-auto no-scrollbar`} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-base-border">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <button onClick={onClose} className="text-muted hover:text-white transition-colors text-xl leading-none">×</button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
