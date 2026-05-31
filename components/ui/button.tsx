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
          "w-full flex h-11 items-center justify-center rounded-xl text-sm font-bold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-md shadow-teal-900/5 active:scale-[0.99]",
          variant === 'primary' && "bg-teal-700 hover:bg-teal-800 text-white focus:ring-teal-500",
          variant === 'secondary' && "bg-slate-100 hover:bg-slate-200 text-slate-700 focus:ring-slate-400",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";