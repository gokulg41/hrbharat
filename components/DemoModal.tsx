"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useDemoModal } from "./DemoModalContext";

type Props = {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
  href?: string; // if provided, renders a Link instead of opening the modal
  icon?: boolean;
  className?: string;
};

export default function CTAButton({
  children,
  variant = "primary",
  size = "md",
  href,
  icon = true,
  className = "",
}: Props) {
  const { openDemoModal } = useDemoModal();

  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold tracking-tight transition-all duration-200";
  const sizes = {
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3.5 text-[15px]",
  };
  const variants = {
    primary:
      "bg-[var(--mkt-navy)] text-white hover:bg-[var(--mkt-navy-soft)] shadow-[0_1px_2px_rgba(11,29,51,0.15)]",
    secondary:
      "bg-white text-[var(--mkt-navy)] border border-[var(--mkt-border-strong)] hover:border-[var(--mkt-navy)] hover:bg-[var(--mkt-canvas-alt)]",
    ghost:
      "text-[var(--mkt-navy)] hover:text-[var(--mkt-teal)] px-2 py-1",
  };

  const classes = `${base} ${sizes[size]} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
        {icon && <ArrowRight className="w-4 h-4" strokeWidth={2} />}
      </Link>
    );
  }

  return (
    <button type="button" onClick={openDemoModal} className={classes}>
      {children}
      {icon && <ArrowRight className="w-4 h-4" strokeWidth={2} />}
    </button>
  );
}
