import Reveal from "./Reveal";

const modules = [
  "Attendance",
  "Payroll",
  "Leave",
  "Employees",
  "Salary advances",
  "Reports",
];

export default function Solution() {
  return (
    <section id="solution" className="bg-white py-24 md:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <Reveal>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#0E7C66]">
                The solution
              </span>
              <h2 className="mt-4 text-[32px] md:text-[40px] font-semibold tracking-[-0.02em] text-[#10131A]">
                One platform. Your entire HR workflow.
              </h2>
              <p className="mt-5 text-[16px] leading-relaxed text-[#5B6472] max-w-lg">
                HRBharat centralizes the systems your business already runs
                on — attendance, payroll, leave, employee records and
                reporting — into a single, connected workflow. Fewer tools.
                Fewer handoffs. One source of truth.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-2xl border border-[#E6E8EC] bg-[#FCFCFB] p-3">
              <div className="grid grid-cols-2 gap-3">
                {modules.map((m, i) => (
                  <div
                    key={m}
                    className={`rounded-xl bg-white border border-[#E6E8EC] px-5 py-6 ${
                      i === 0 ? "col-span-2" : ""
                    }`}
                  >
                    {i === 0 ? (
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-semibold text-[#10131A]">
                          {m}
                        </span>
                        <span className="text-[11px] font-mono text-[#0E7C66] bg-[#E9F5F2] px-2 py-1 rounded-md">
                          Connected
                        </span>
                      </div>
                    ) : (
                      <span className="text-[13.5px] font-medium text-[#10131A]">
                        {m}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
