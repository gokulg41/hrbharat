import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-[#e9e9e7] bg-white">
      <div className="max-w-5xl mx-auto px-8 py-8">

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#37352f] flex items-center justify-center shrink-0">
              <span className="text-white text-[8px] font-bold">HB</span>
            </div>
            <span className="text-sm font-medium text-[#37352f]">HRBharath</span>
            <span className="text-xs text-[#9b9a97]">· Workforce management for Indian SMEs</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms & Conditions", href: "/terms" },
              { label: "Refund Policy", href: "/refund" },
              { label: "Contact Us", href: "/contact" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-[#787774] hover:text-[#37352f] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-[#e9e9e7] flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <p className="text-xs text-[#9b9a97]">
            © {new Date().getFullYear()} HRBharath. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-[#9b9a97]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0f7b43]" />
            Secured by Cashfree · Payments encrypted
          </div>
        </div>

      </div>
    </footer>
  );
}