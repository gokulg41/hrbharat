import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    return (
      <button
        className={cn(
          "w-full flex h-11 items-center justify-center rounded-xl text-sm font-bold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-md active:scale-[0.99]",
          variant === 'primary' && "bg-brand hover:bg-brand-hover text-white focus:ring-brand",
          variant === 'secondary' && "bg-surface-card-hover hover:bg-border-subtle text-ink-600 focus:ring-border-hover",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";