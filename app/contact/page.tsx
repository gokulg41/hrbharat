"use client";

import { Mail, MapPin, Clock } from "lucide-react";

export default function ContactUs() {
  return (
    <div className="min-h-screen bg-white font-sans text-[#37352f]">
      <header className="border-b border-[#e9e9e7] sticky top-0 z-40 bg-white">
        <div className="max-w-3xl mx-auto px-8 h-12 flex items-center gap-1.5 text-sm">
          <a href="/" className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-[#37352f] flex items-center justify-center shrink-0">
              <span className="text-white text-[8px] font-bold">HB</span>
            </div>
          </a>
          <span className="text-[#c1c0bb]">/</span>
          <span className="font-medium">Contact Us</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-12 space-y-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
          <p className="text-sm text-[#9b9a97]">
            We're here to help. Reach out and we'll get back to you as soon as possible.
          </p>
        </div>

        <hr className="border-[#e9e9e7]" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: <Mail className="w-4 h-4 text-[#0f7b43]" />,
              label: "Email",
              value: "gokulgopakumar5556@gmail.com",
              sub: "For support, billing & refund queries",
            },
            {
              icon: <MapPin className="w-4 h-4 text-[#2eaadc]" />,
              label: "Location",
              value: "Hyderabad, Telangana",
              sub: "India",
            },
            {
              icon: <Clock className="w-4 h-4 text-[#787774]" />,
              label: "Response Time",
              value: "Within 24 hours",
              sub: "Monday – Saturday",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="border border-[#e9e9e7] rounded-lg p-5 space-y-2 bg-[#f7f6f3]"
            >
              <div className="flex items-center gap-2">
                {item.icon}
                <span className="text-xs font-semibold text-[#9b9a97] uppercase tracking-wide">
                  {item.label}
                </span>
              </div>
              <p className="text-sm font-medium text-[#37352f] break-all">{item.value}</p>
              <p className="text-xs text-[#9b9a97]">{item.sub}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-semibold">Frequently Asked Questions</h2>

          {[
            {
              q: "How do I cancel my trial?",
              a: `Email us at gokulgopakumar5556@gmail.com before day 8 of your trial with your registered email and we'll cancel it immediately — no questions asked.`,
            },
            {
              q: "I was charged incorrectly. What do I do?",
              a: `Email us with your Cashfree order ID and registered email. We'll review and process your refund within 5–7 business days if eligible.`,
            },
            {
              q: "How do I upgrade or downgrade my plan?",
              a: `Contact us via email and we'll adjust your plan from the next billing cycle.`,
            },
            {
              q: "Is my employee data secure?",
              a: `Yes. All data is stored in encrypted cloud infrastructure. We never share your employee data with third parties. See our Privacy Policy for details.`,
            },
          ].map((faq) => (
            <div key={faq.q} className="border border-[#e9e9e7] rounded-lg p-5 space-y-1.5">
              <p className="text-sm font-medium text-[#37352f]">{faq.q}</p>
              <p className="text-sm text-[#787774] leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-[#e9e9e7] mt-16">
        <div className="max-w-3xl mx-auto px-8 py-6 text-xs text-[#9b9a97]">
          © {new Date().getFullYear()} HRBharath. All rights reserved.
        </div>
      </footer>
    </div>
  );
}