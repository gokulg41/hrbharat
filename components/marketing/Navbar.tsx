"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import CTAButton from "./CTAButton";

const NAV_LINKS = [
  { label: "Platform", href: "#solution" },
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#industries" },
  { label: "Resources", href: "#faq" },
  { label: "About", href: "#global" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[var(--mkt-canvas)]/90 backdrop-blur-md border-b border-[var(--mkt-border)]"
          : "bg-[var(--mkt-canvas)]/0 border-b border-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-lg font-bold tracking-tight text-[var(--mkt-navy)]">
            HR<span className="text-[var(--mkt-teal)]">Bharat</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[var(--mkt-text)]/80 hover:text-[var(--mkt-navy)] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-semibold text-[var(--mkt-text)]/80 hover:text-[var(--mkt-navy)] px-3 py-2 transition-colors"
          >
            Log in
          </Link>
          <CTAButton size="md" icon={false}>
            Book a Demo
          </CTAButton>
        </div>

        <button
          type="button"
          className="md:hidden p-2 -mr-2 text-[var(--mkt-navy)]"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="md:hidden bg-[var(--mkt-canvas)] border-t border-[var(--mkt-border)] px-5 py-5 space-y-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 text-[15px] font-medium text-[var(--mkt-text)]"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 mt-3 border-t border-[var(--mkt-border)] flex flex-col gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-[var(--mkt-navy)] py-1"
            >
              Log in
            </Link>
            <CTAButton size="md" icon={false} className="justify-center">
              Book a Demo
            </CTAButton>
          </div>
        </div>
      )}
    </header>
  );
}
