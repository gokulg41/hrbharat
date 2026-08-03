import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import DemoForm from "@/components/marketing/DemoForm";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export const metadata = {
  title: "Book a Demo — HRBharat",
  description:
    "See how HRBharat can simplify HR, payroll and attendance for your business. Book a demo with our team.",
};

export default function BookDemoPage() {
  return (
    <div className="bg-[#FCFCFB] min-h-screen">
      <MarketingNav />
      <main className="pt-36 pb-24 md:pt-44 md:pb-28">
        <div className="max-w-lg mx-auto px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#5B6472] hover:text-[#10131A] transition-colors mb-8"
          >
            <ArrowLeft size={14} />
            Back to home
          </Link>

          <h1 className="text-[32px] md:text-[38px] font-semibold tracking-[-0.02em] text-[#10131A]">
            Book a demo
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#5B6472] max-w-md">
            Tell us a little about your business, and our team will get in
            touch to schedule a walkthrough of HRBharat.
          </p>

          <div className="mt-9">
            <DemoForm />
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
