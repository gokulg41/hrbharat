import {
  TimerReset,
  ShieldCheck,
  Sparkles,
  Radar,
  LayoutGrid,
  TrendingUp,
} from "lucide-react";
import Reveal from "./Reveal";

const benefits = [
  {
    icon: TimerReset,
    title: "Save time",
    desc: "Cut hours of manual attendance and payroll admin out of every month.",
  },
  {
    icon: ShieldCheck,
    title: "Improve payroll accuracy",
    desc: "Reduce the manual calculation errors that cost trust and money.",
  },
  {
    icon: Sparkles,
    title: "A better employee experience",
    desc: "Give employees a simple way to check in, request leave, and get answers.",
  },
  {
    icon: Radar,
    title: "Real-time visibility",
    desc: "See attendance, payroll status and requests as they happen, not after.",
  },
  {
    icon: LayoutGrid,
    title: "Centralize HR operations",
    desc: "Replace scattered spreadsheets and chats with one connected system.",
  },
  {
    icon: TrendingUp,
    title: "Reduce manual work",
    desc: "Let the platform handle repetitive admin so your team can focus elsewhere.",
  },
];

export default function WhyHRBharat() {
  return (
    <section className="bg-white py-24 md:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <h2 className="text-[32px] md:text-[40px] font-semibold tracking-[-0.02em] text-[#10131A] max-w-2xl">
            Built around the way modern businesses actually work.
          </h2>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
          {benefits.map((b, i) => (
            <Reveal key={b.title} delay={i * 60}>
              <div className="flex gap-4">
                <div className="w-9 h-9 shrink-0 rounded-lg bg-[#E9F5F2] flex items-center justify-center">
                  <b.icon size={16} className="text-[#0E7C66]" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[#10131A]">
                    {b.title}
                  </h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#5B6472]">
                    {b.desc}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
