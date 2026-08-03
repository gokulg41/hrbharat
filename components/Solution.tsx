"use client";

import { useState } from "react";

const TABS = [
  {
    key: "dashboard",
    label: "Dashboard",
    rows: [
      ["Total employees", "226"],
      ["Present today", "94%"],
      ["Pending approvals", "5"],
    ],
  },
  {
    key: "attendance",
    label: "Attendance",
    rows: [
      ["Ravi K. — Warehouse", "Checked in · 09:02"],
      ["Fatima A. — Retail", "Checked in · 08:47"],
      ["Arjun S. — Ops", "On leave"],
    ],
  },
  {
    key: "payroll",
    label: "Payroll",
    rows: [
      ["Current cycle", "Processing"],
      ["Employees included", "226"],
      ["Estimated completion", "2 days"],
    ],
  },
  {
    key: "employees",
    label: "Employees",
    rows: [
      ["Active employees", "226"],
      ["New this month", "8"],
      ["Departments", "6"],
    ],
  },
  {
    key: "leave",
    label: "Leave",
    rows: [
      ["Pending requests", "3"],
      ["Approved this week", "11"],
      ["On leave today", "4"],
    ],
  },
];

export default function ProductShowcase() {
  const [active, setActive] = useState(TABS[0].key);
  const activeTab = TABS.find((t) => t.key === active)!;

  return (
    <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
      <div className="max-w-2xl mx-auto text-center">
        <span className="mkt-eyebrow">Inside the platform</span>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--mkt-navy)]">
          A real, working system — not a mockup.
        </h2>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2 rounded-full text-[13.5px] font-medium transition-colors ${
              active === tab.key
                ? "bg-[var(--mkt-navy)] text-white"
                : "text-[var(--mkt-muted)] hover:text-[var(--mkt-navy)] border border-[var(--mkt-border)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8 max-w-3xl mx-auto">
        <div className="mkt-console rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.08]">
            <span className="w-2 h-2 rounded-full bg-white/25" />
            <span className="w-2 h-2 rounded-full bg-white/25" />
            <span className="w-2 h-2 rounded-full bg-white/25" />
            <span className="mkt-console-mono text-[11px] text-white/50 ml-2 uppercase tracking-wider">
              {activeTab.label}
            </span>
          </div>
          <div className="p-6 space-y-3">
            {activeTab.rows.map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-lg bg-white/[0.04] border border-white/[0.08] px-4 py-3.5"
              >
                <span className="text-[13.5px] text-white/70">{label}</span>
                <span className="mkt-console-mono text-[13px] text-[var(--mkt-teal-light)]">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
