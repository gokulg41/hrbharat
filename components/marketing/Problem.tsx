import {
  FileSpreadsheet,
  MessageCircleWarning,
  CalendarX2,
  CalculatorIcon,
  EyeOff,
  Clock,
} from "lucide-react";
import Reveal from "./Reveal";

const problems = [
  {
    icon: Clock,
    title: "Manual attendance tracking",
    desc: "Registers, punch sheets and end-of-month reconciliation eat hours every week.",
  },
  {
    icon: CalculatorIcon,
    title: "Payroll calculations",
    desc: "Manual salary, deduction and overtime math leaves room for costly errors.",
  },
  {
    icon: CalendarX2,
    title: "Leave management chaos",
    desc: "Approvals lost across calls, notebooks and forwarded messages.",
  },
  {
    icon: MessageCircleWarning,
    title: "Requests scattered across WhatsApp",
    desc: "Advances, leave and queries pile up in chats with no record.",
  },
  {
    icon: EyeOff,
    title: "Lack of visibility",
    desc: "No single view of who's working, who's owed what, or what's pending.",
  },
  {
    icon: FileSpreadsheet,
    title: "Spreadsheet dependency",
    desc: "Critical HR data lives in files that are easy to break and hard to trust.",
  },
];

export default function Problem() {
  return (
    <section className="bg-[#FCFCFB] py-24 md:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <h2 className="text-[32px] md:text-[40px] font-semibold tracking-[-0.02em] text-[#10131A] max-w-xl">
            HR shouldn&apos;t feel like another full-time job.
          </h2>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {problems.map((p, i) => (
            <Reveal key={p.title} delay={i * 60}>
              <div className="h-full rounded-2xl bg-white border border-[#E6E8EC] p-6 hover:border-[#C7CBD3] transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[#F4F5F7] flex items-center justify-center mb-5">
                  <p.icon size={18} className="text-[#5B6472]" />
                </div>
                <h3 className="text-[15px] font-semibold text-[#10131A] mb-1.5">
                  {p.title}
                </h3>
                <p className="text-[13.5px] leading-relaxed text-[#5B6472]">
                  {p.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
