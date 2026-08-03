import CTAButton from "./CTAButton";

export default function FinalCTA() {
  return (
    <section className="bg-[var(--mkt-navy-deep)]">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 sm:py-28 text-center">
        <h2 className="text-3xl sm:text-[2.6rem] font-bold tracking-tight text-white leading-tight">
          Ready to simplify your HR?
        </h2>
        <p className="mt-4 text-[15.5px] text-white/60 max-w-xl mx-auto leading-relaxed">
          See how HRBharat can transform the way your business manages
          people, payroll and everyday HR operations.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <CTAButton size="lg" className="!bg-white !text-[var(--mkt-navy)] hover:!bg-white/90">
            Book a Demo
          </CTAButton>
          <CTAButton variant="ghost" size="lg" href="#solution" icon={false} className="!text-white hover:!text-[var(--mkt-teal-light)]">
            Get Started
          </CTAButton>
        </div>
      </div>
    </section>
  );
}
