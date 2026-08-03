"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "What is HRBharat?",
    a: "HRBharat is an HR and payroll technology platform that brings attendance, payroll, leave management and employee operations into one system for growing businesses.",
  },
  {
    q: "Who is HRBharat designed for?",
    a: "HRBharat is built for founders, business owners, HR managers and operations teams at growing businesses across India and the UAE.",
  },
  {
    q: "Can HRBharat manage employee attendance?",
    a: "Yes. HRBharat supports GPS and geofence-based attendance tracking with centralized visibility for your whole team.",
  },
  {
    q: "Can HRBharat handle payroll?",
    a: "Yes. HRBharat simplifies payroll processing and reduces the manual calculations that typically take up a large part of every month.",
  },
  {
    q: "Does HRBharat support leave management?",
    a: "Yes. Employees can request leave and managers can approve or manage requests digitally, with a clear record of every decision.",
  },
  {
    q: "Can employees submit requests through the platform?",
    a: "Yes, including leave requests and salary advance requests, both with a transparent approval trail.",
  },
  {
    q: "Is HRBharat suitable for small businesses?",
    a: "Yes. HRBharat is built to work for growing businesses of varying sizes, from small teams to larger, distributed operations.",
  },
  {
    q: "Does HRBharat work for businesses in India and UAE?",
    a: "Yes. HRBharat is designed for growing businesses across both India and the UAE.",
  },
  {
    q: "How can I book a demo?",
    a: "Use the \"Book a Demo\" button anywhere on this page to share a few details, and our team will reach out to schedule a walkthrough.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="max-w-4xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
      <div className="text-center max-w-xl mx-auto">
        <span className="mkt-eyebrow">FAQ</span>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--mkt-navy)]">
          Frequently asked questions.
        </h2>
      </div>

      <div className="mt-10 divide-y divide-[var(--mkt-border)] border-t border-b border-[var(--mkt-border)]">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 py-5 text-left"
                aria-expanded={isOpen}
              >
                <span className="text-[15px] font-medium text-[var(--mkt-navy)]">
                  {item.q}
                </span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 text-[var(--mkt-muted)] transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <p className="pb-5 text-[14px] text-[var(--mkt-muted)] leading-relaxed pr-8">
                  {item.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
