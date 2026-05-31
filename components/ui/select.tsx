import * as React from "react";
import { cn } from "../../lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string | number }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="w-full mb-4">
        {label && <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">{label}</label>}
        <select
          ref={ref}
          className={cn(
            "w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm shadow-sm transition-all focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 appearance-none",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";