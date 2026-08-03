"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { label: "Platform", href: "#solution" },
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#industries" },
  { label: "Resources", href: "#faq" },
  { label: "About", href: "#global" },
];

export default function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#FCFCFB]/85 backdrop-blur-md border-b border-[#E6E8EC] py-3"
          : "bg-transparent border-b border-transparent py-5"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="w-7 h-7 rounded-md bg-[#0B1220] flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#0E7C66]" />
          </span>
          <span className="text-[17px] font-semibold tracking-tight text-[#10131A]">
            HR<span className="text-[#0E7C66]">Bharat</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-9">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-[14px] font-medium text-[#5B6472] hover:text-[#10131A] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-[14px] font-medium text-[#5B6472] hover:text-[#10131A] transition-colors px-2"
          >
            Log in
          </Link>
          <Link
            href="/book-demo"
            className="text-[14px] font-semibold bg-[#0B1220] text-white px-4 py-2.5 rounded-lg hover:bg-[#142238] transition-colors shadow-[0_1px_2px_rgba(11,18,32,0.15)]"
          >
            Book a Demo
          </Link>
        </div>

        <button
          aria-label={open ? "Close menu" : "Open menu"}
          className="md:hidden text-[#10131A]"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-[#FCFCFB] border-t border-[#E6E8EC] px-6 py-5 flex flex-col gap-4">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-[15px] font-medium text-[#10131A]"
            >
              {l.label}
            </a>
          ))}
          <div className="h-px bg-[#E6E8EC] my-1" />
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="text-[15px] font-medium text-[#5B6472]"
          >
            Log in
          </Link>
          <Link
            href="/book-demo"
            onClick={() => setOpen(false)}
            className="text-[15px] font-semibold bg-[#0B1220] text-white text-center px-4 py-3 rounded-lg"
          >
            Book a Demo
          </Link>
        </div>
      )}
    </header>
  );
}
