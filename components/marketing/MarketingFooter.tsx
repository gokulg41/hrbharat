import Link from "next/link";
import { Linkedin, Facebook } from "lucide-react";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Platform", href: "#solution" },
      { label: "Features", href: "#features" },
      { label: "Solutions", href: "#industries" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#global" },
      { label: "Contact", href: "/book-demo" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export default function MarketingFooter() {
  return (
    <footer className="bg-white border-t border-[#E6E8EC]">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-12">
          <div>
            <span className="text-[17px] font-semibold tracking-tight text-[#10131A]">
              HR<span className="text-[#0E7C66]">Bharat</span>
            </span>
            <p className="mt-3 text-[13.5px] leading-relaxed text-[#5B6472] max-w-[240px]">
              Modern HR &amp; payroll software for growing businesses.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="#"
                aria-label="HRBharat on LinkedIn"
                className="w-8 h-8 rounded-full bg-[#F4F5F7] flex items-center justify-center text-[#5B6472] hover:text-[#10131A] transition-colors"
              >
                <Linkedin size={14} />
              </a>
              <a
                href="#"
                aria-label="HRBharat on Facebook"
                className="w-8 h-8 rounded-full bg-[#F4F5F7] flex items-center justify-center text-[#5B6472] hover:text-[#10131A] transition-colors"
              >
                <Facebook size={14} />
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-[12px] font-mono uppercase tracking-[0.1em] text-[#5B6472] mb-4">
                {col.title}
              </p>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[13.5px] text-[#10131A]/80 hover:text-[#10131A] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-[#E6E8EC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[12.5px] text-[#5B6472]">
            © {new Date().getFullYear()} HRBharat. All rights reserved.
          </p>
          <p className="text-[12.5px] text-[#5B6472]">
            hello@hrbharat.com
          </p>
        </div>
      </div>
    </footer>
  );
}
