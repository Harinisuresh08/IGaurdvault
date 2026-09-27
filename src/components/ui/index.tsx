import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, useEffect, useRef } from "react";
import { Loader as Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "success" | "warning";
type Size = "xs" | "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  glow?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "gradient-accent text-white shadow-glow hover:shadow-glow-md hover:scale-[1.02]",
  secondary: "bg-base-elevated text-white hover:bg-base-hover border border-base-border hover:border-accent/30",
  ghost: "text-muted-light hover:text-white hover:bg-base-elevated",
  danger: "gradient-danger text-white shadow-glow-danger hover:scale-[1.02]",
  outline: "border border-accent/40 text-accent hover:bg-accent-soft hover:border-accent",
  success: "bg-gradient-to-r from-success to-green-600 text-white shadow-glow-success hover:scale-[1.02]",
  warning: "bg-gradient-to-r from-warning to-amber-600 text-black font-semibold hover:scale-[1.02]",
};

const sizes: Record<Size, string> = {
  xs: "px-2.5 py-1 text-[11px] rounded-lg gap-1",
  sm: "px-3 py-1.5 text-xs rounded-xl gap-1.5",
  md: "px-4 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-6 py-3 text-base rounded-xl gap-2",
  xl: "px-8 py-4 text-lg rounded-2xl gap-3",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, icon, iconRight, children, className = "", disabled, glow, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${variants[variant]} ${sizes[size]} ${glow ? "animate-glow-pulse" : ""} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  ),
);
Button.displayName = "Button";

/* ── Input ── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
  onIconRightClick?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, onIconRightClick, className = "", ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-muted-light mb-1.5">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">{icon}</div>}
        <input
          ref={ref}
          className={`w-full bg-base-surface border border-base-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-muted-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-200 ${icon ? "pl-10" : ""} ${iconRight ? "pr-10" : ""} ${error ? "border-danger focus:border-danger focus:ring-danger/30" : ""} ${className}`}
          {...props}
        />
        {iconRight && (
          <button
            type="button"
            onClick={onIconRightClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
          >
            {iconRight}
          </button>
        )}
      </div>
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-danger mt-1 flex items-center gap-1">
          <span>⚠</span> {error}
        </motion.p>
      )}
      {hint && !error && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  ),
);
Input.displayName = "Input";

/* ── Textarea ── */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-muted-light mb-1.5">{label}</label>}
      <textarea
        ref={ref}
        className={`w-full bg-base-surface border border-base-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-muted-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-200 resize-none ${error ? "border-danger" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  ),
);
Textarea.displayName = "Textarea";

/* ── Card ── */
interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: () => void;
  hover?: boolean;
  noPad?: boolean;
  gradient?: boolean;
}

export function Card({ children, className = "", glow, onClick, hover = false, noPad = false, gradient = false }: CardProps) {
  return (
    <div
      className={`glass rounded-2xl ${noPad ? "" : "p-5"} ${glow ? "shadow-glow border-accent/20" : ""} ${hover ? "card-hover cursor-pointer" : ""} ${gradient ? "border border-accent/10" : ""} transition-all duration-300 ${className}`}
      onClick={onClick}
      style={gradient ? { background: "linear-gradient(135deg, rgba(20,27,45,0.8) 0%, rgba(10,15,25,0.9) 100%)" } : undefined}
    >
      {children}
    </div>
  );
}

/* ── Badge ── */
export function Badge({ children, color = "#00E5FF", className = "" }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ background: `${color}1A`, color, border: `1px solid ${color}40` }}
    >
      {children}
    </span>
  );
}

/* ── Spinner ── */
export function Spinner({ size = 24, color = "#00E5FF" }: { size?: number; color?: string }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: `${color}33`, borderTopColor: color }}
      />
    </div>
  );
}

/* ── EmptyState ── */
export function EmptyState({ icon, title, message, action }: { icon?: ReactNode; title: string; message?: string; action?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      {icon && (
        <div className="text-muted/40 mb-4 p-6 rounded-full bg-base-elevated border border-base-border">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      {message && <p className="text-sm text-muted max-w-md leading-relaxed">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

/* ── Toggle ── */
export function Toggle({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className={`inline-flex items-center gap-3 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      aria-checked={checked}
      role="switch"
    >
      <div
        className={`relative transition-all duration-300 rounded-full ${checked ? "gradient-accent shadow-glow" : "bg-base-border"}`}
        style={{ width: 44, height: 24 }}
      >
        <div
          className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300"
          style={{ left: checked ? 20 : 2 }}
        />
      </div>
      {label && <span className="text-sm text-muted-light">{label}</span>}
    </button>
  );
}

/* ── ProgressRing ── */
export function ProgressRing({
  value, size = 120, stroke = 8, color = "#00E5FF", label, sublabel, animate: doAnimate = true,
}: {
  value: number; size?: number; stroke?: number; color?: string; label?: string; sublabel?: string; animate?: boolean;
}) {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-full opacity-20 blur-md"
        style={{ background: `radial-gradient(circle, ${color}40, transparent)` }}
      />
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1E293B" strokeWidth={stroke} />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={doAnimate ? offset : circumference}
          strokeLinecap="round"
          style={{
            transition: doAnimate ? "stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)" : undefined,
            strokeDashoffset: offset,
            filter: `drop-shadow(0 0 8px ${color}80)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && <span className="font-bold text-white" style={{ fontSize: size * 0.2 }}>{label}</span>}
        {sublabel && <span className="text-muted" style={{ fontSize: size * 0.09 }}>{sublabel}</span>}
      </div>
    </div>
  );
}

/* ── Modal ── */
export function Modal({ open, onClose, children, title, size = "md" }: {
  open: boolean; onClose: () => void; children: ReactNode; title?: string; size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  const sizeMap = { xs: "max-w-xs", sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`relative glass-strong rounded-2xl w-full ${sizeMap[size]} max-h-[90vh] overflow-y-auto no-scrollbar shadow-card border border-base-border`}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-base-border">
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg bg-base-elevated flex items-center justify-center text-muted hover:text-white hover:bg-base-hover transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ── SkeletonLine ── */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-base-elevated rounded-lg shimmer ${className}`} />
  );
}

/* ── Alert Banner ── */
export function AlertBanner({
  type = "info", title, message, onClose,
}: {
  type?: "info" | "success" | "warning" | "danger";
  title: string;
  message?: string;
  onClose?: () => void;
}) {
  const colors = {
    info: { bg: "#00E5FF1A", border: "#00E5FF40", text: "#00E5FF" },
    success: { bg: "#22C55E1A", border: "#22C55E40", text: "#22C55E" },
    warning: { bg: "#F59E0B1A", border: "#F59E0B40", text: "#F59E0B" },
    danger: { bg: "#EF44441A", border: "#EF444440", text: "#EF4444" },
  };
  const c = colors[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-start gap-3 p-4 rounded-xl border"
      style={{ background: c.bg, borderColor: c.border }}
    >
      <div className="flex-1">
        <p className="text-sm font-semibold" style={{ color: c.text }}>{title}</p>
        {message && <p className="text-xs text-muted mt-0.5">{message}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className="text-muted hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

/* ── StatCard ── */
export function StatCard({
  icon, label, value, delta, color = "#00E5FF", onClick,
}: {
  icon: ReactNode; label: string; value: string | number; delta?: string;
  color?: string; onClick?: () => void;
}) {
  return (
    <Card hover={!!onClick} onClick={onClick} className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5" style={{ background: color, filter: "blur(24px)", transform: "translate(30%, -30%)" }} />
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}1A` }}>
          <div style={{ color }}>{icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {delta && (
            <p className="text-xs text-muted mt-0.5">{delta}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ── ProgressBar ── */
export function ProgressBar({
  value, max = 100, color = "#00E5FF", label, className = "",
}: {
  value: number; max?: number; color?: string; label?: string; className?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-xs text-muted">{label}</span>
          <span className="text-xs font-mono" style={{ color }}>{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-1.5 rounded-full bg-base-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})`, boxShadow: `0 0 8px ${color}66` }}
        />
      </div>
    </div>
  );
}

/* ── SectionTitle ── */
export function SectionTitle({ title, subtitle, icon, className = "", action }: { title: string; subtitle?: string; icon?: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <div className={`mb-6 flex items-start justify-between ${className}`}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          {icon && <div className="text-accent">{icon}</div>}
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
