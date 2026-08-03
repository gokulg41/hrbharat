const MODULES = [
  "Attendance",
  "Payroll",
  "Leave",
  "Employees",
  "Salary advances",
  "Reports",
];

export default function Solution() {
  return (
    <section id="solution" className="bg-[var(--mkt-canvas-alt)] border-y border-[var(--mkt-border)]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <span className="mkt-eyebrow">The solution</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--mkt-navy)]">
            One platform. Your entire HR workflow.
          </h2>
          <p className="mt-5 text-[15.5px] text-[var(--mkt-muted)] leading-relaxed max-w-lg">
            HRBharat centralizes attendance, payroll, leave, employee
            records, salary advance requests and reporting — so nothing
            lives in a separate spreadsheet, chat thread or notebook.
            One system your whole team can rely on.
          </p>
        </div>

        <div className="relative aspect-square max-w-md mx-auto w-full">
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <g stroke="var(--mkt-border-strong)" strokeWidth="1">
              {MODULES.map((_, i) => {
                const angle = (i / MODULES.length) * 2 * Math.PI - Math.PI / 2;
                const x = 200 + Math.cos(angle) * 145;
                const y = 200 + Math.sin(angle) * 145;
                return <line key={i} x1="200" y1="200" x2={x} y2={y} />;
              })}
            </g>
            <circle cx="200" cy="200" r="58" fill="var(--mkt-navy)" />
            <text
              x="200"
              y="196"
              textAnchor="middle"
              fill="white"
              fontSize="15"
              fontWeight="700"
            >
              HR
            </text>
            <text
              x="200"
              y="214"
              textAnchor="middle"
              fill="white"
              fontSize="15"
              fontWeight="700"
            >
              Bharat
            </text>
          </svg>

          {MODULES.map((mod, i) => {
            const angle = (i / MODULES.length) * 2 * Math.PI - Math.PI / 2;
            const x = 50 + Math.cos(angle) * 36;
            const y = 50 + Math.sin(angle) * 36;
            return (
              <div
                key={mod}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div className="mkt-card rounded-full px-3.5 py-2 text-[12.5px] font-medium whitespace-nowrap text-[var(--mkt-navy)] shadow-sm">
                  {mod}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
