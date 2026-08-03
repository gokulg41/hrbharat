"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import CTAButton from "./CTAButton";

type FAQItem = {
  question: string;
  answer: string;
};

const faqs: FAQItem[] = [
  {
    question: "Is HRBharat compliant with Indian payroll and labour laws?",
    answer:
      "Yes. HRBharat is built for Indian compliance from the ground up — PF, ESI, professional tax, TDS, and state-specific labour law rules are handled automatically and updated as regulations change.",
  },
  {
    question: "Can HRBharat handle multi-state and multi-branch payroll?",
    answer:
      "Absolutely. You can manage employees across multiple states and branches from a single dashboard, with state-specific statutory rules applied automatically to each employee's payroll.",
  },
  {
    question: "How long does implementation take?",
    answer:
      "Most teams are fully onboarded within 1–2 weeks, including employee data migration, payroll configuration, and compliance setup. Our team supports you through the entire process.",
  },
  {
    question: "Does HRBharat integrate with our existing accounting software?",
    answer:
      "Yes. HRBharat integrates with popular accounting and ERP tools so payroll, expenses, and reimbursements sync automatically without manual data entry.",
  },
  {
    question: "What size companies is HRBharat built for?",
    answer:
      "HRBharat works well for growing businesses from 10 to 1000+ employees. Our plans scale with your team, and enterprise customers get dedicated onboarding support.",
  },
  {
    question: "Is there a free trial available?",
    answer:
      "Yes, we offer a free trial so you can explore HRBharat with your own data before committing. Book a demo below and our team will get you set up.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  function toggle(index: number) {
    setOpenIndex((prev) => (prev === index ? null : index));
  }

  return (
    <section className="mkt py-20 md:py-28 bg-[var(--mkt-canvas-alt)]">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="mkt-eyebrow">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--mkt-navy)] mt-2">
            Frequently asked questions
          </h2>
          <p className="text-sm md:text-base text-[var(--mkt-muted)] mt-3 max-w-xl mx-auto">
            Everything you need to know about running HR and payroll with
            HRBharat. Can't find what you're looking for? Book a demo and
            we'll walk you through it.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className="mkt-card rounded-2xl border border-[var(--mkt-border-strong)] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-sm md:text-base font-semibold text-[var(--mkt-navy)]">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 shrink-0 text-[var(--mkt-muted)] transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-200 ease-in-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-sm text-[var(--mkt-muted)] leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-14 text-center">
          <p className="text-sm text-[var(--mkt-muted)] mb-4">
            Still have questions?
          </p>
          <CTAButton size="lg">Book a demo</CTAButton>
        </div>
      </div>
    </section>
  );
}
