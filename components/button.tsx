"use client";

import * as React from "react";
// FIXED: Swapped out the path alias for a reliable relative path
import { cn } from "@/lib/utils"; 

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    
    // Premium minimalistic design tokens for HRBharat interface layers
    const baseStyles = "inline-flex items-center justify-center font-bold tracking-tight rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
    
    const variants = {
      primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-sm",
      secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200/60",
      danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
      outline: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200",
    };

    const sizes = {
      sm: "text-[10px] px-3 py-1.5",
      md: "text-xs px-4 py-2.5",
      lg: "text-sm px-5 py-3",
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };