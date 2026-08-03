"use client";

import { useState } from "react";
import Reveal from "./Reveal";

const tabs = [
  {
    key: "dashboard",
    label: "Dashboard",
    stat: "182",
    statLabel: "Active employees",
    rows: [
      ["Attendance today", "94% checked in"],
      ["Payroll status", "In progress"],
      ["Pending requests", "6"],
    ],
  },
  {
    key: "attendance",
    label: "Attendance",
    stat: "94%",
    statLabel: "On-time check-in rate",
    rows: [
      ["Operations", "38 / 40 checked in"],
      ["Sales", "22 / 24 checked in"],
      ["Manufacturing", "58 / 62 checked in"],
    ],
  },
  {
    key: "payroll",
    label: "Payroll",
    stat: "78%",
    statLabel: "Processed this cycle",
    rows: [
      ["Base salary run", "Complete"],
      ["Overtime adjustments", "In review"],
      ["Payslip distribution", "Pending"],
    ],
  },
  {
    key: "employees",
    label: "Employees",
    stat: "12",
    statLabel: "New this month",
    rows: [
      ["Onboarding in progress", "4"],
      ["Documents pending", "3"],
      ["Departments", "6"],
    ],
  },
  {
    key: "leave",
    label: "Leave",
    stat: "9",
    statLabel: "Pending approvals",
    rows: [
      ["Annual leave requests", "5"],
      ["Sick leave requests", "2"],
      ["Advance requests", "2"],
    ],
  },
];

export default function ProductShowcase() {
  const [active, setActive] = useState(tabs[0].key);
  const current = tabs.find((t) => t.key === active)!;

  return (
    <section className="bg-white py-24 md:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="max-w-xl mx-auto text-center">
            <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#0E7C66]">
              Inside HRBharat
            </span>
            <h2 className="mt-4 text-[32px] md:text-[40px] font-semibold tracking-[-0.02em] text-[#10131A]">
              A real, working platform.
            </h2>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-12 flex flex-wrap justify-center gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`text-[13.5px] font-medium px-4 py-2 rounded-lg border transition-colors ${
                  active === t.key
                    ? "bg-[#0B1220] text-white border-[#0B1220]"
                    : "bg-white text-[#5B6472] border-[#E6E8EC] hover:border-[#C7CBD3]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={160}>
          <div className="mt-8 max-w-3xl mx-auto rounded-2xl border border-[#E6E8EC] bg-[#FCFCFB] p-8">
            <div className="flex items-baseline gap-3">
              <span className="text-[36px] font-semibold tracking-[-0.02em] text-[#10131A]">
                {current.stat}
              </span>
              <span className="text-[13.5px] text-[#5B6472]">
                {current.statLabel}
              </span>
            </div>
            <div className="mt-6 divide-y divide-[#E6E8EC]">
              {current.rows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-3.5"
                >
                  <span className="text-[13.5px] text-[#5B6472]">
                    {label}
                  </span>
                  <span className="text-[13.5px] font-medium text-[#10131A]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
