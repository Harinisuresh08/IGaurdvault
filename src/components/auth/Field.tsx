import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  error?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, icon, error, className = "", ...props }, ref) => (
    <div className="w-full">
      <label className="block text-xs font-medium text-muted-light mb-1.5">{label}</label>
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
Field.displayName = "Field";
