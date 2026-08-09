import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, ...props }, ref) => {
    return (
      <div className="w-full text-left space-y-1.5">
        {label && (
          <label className="block text-xs font-bold text-ink-600 uppercase tracking-wide">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-status-danger focus:ring-status-danger",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-xs font-semibold text-status-danger mt-1">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";