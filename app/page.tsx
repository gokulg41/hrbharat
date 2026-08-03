import "./marketing-theme.css";

import { DemoModalProvider } from "@/components/marketing/DemoModalContext";
import Navbar from "@/components/marketing/Navbar";
import Hero from "@/components/marketing/Hero";
import Problem from "@/components/marketing/Problem";
import Solution from "@/components/marketing/Solution";
import Features from "@/components/marketing/Features";
import WhyHRBharat from "@/components/marketing/WhyHRBharat";
import Industries from "@/components/marketing/Industries";
import HowItWorks from "@/components/marketing/HowItWorks";
import ProductShowcase from "@/components/marketing/ProductShowcase";
import Testimonials from "@/components/marketing/Testimonials";
import FAQ from "@/components/marketing/FAQ";
import FinalCTA from "@/components/marketing/FinalCTA";

export const metadata = {
  title: "HRBharat — HR & Payroll Software for Growing Businesses",
  description:
    "HRBharat simplifies HR, payroll, attendance and employee management for growing businesses in India and the UAE.",
  openGraph: {
    title: "HRBharat — HR & Payroll Software for Growing Businesses",
    description:
      "HRBharat simplifies HR, payroll, attendance and employee management for growing businesses in India and the UAE.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HRBharat — HR & Payroll Software for Growing Businesses",
    description:
      "HRBharat simplifies HR, payroll, attendance and employee management for growing businesses in India and the UAE.",
  },
};

export default function LandingPage() {
  return (
    <div className="mkt">
      <DemoModalProvider>
        <Navbar />
        <main>
          <Hero />
          <Problem />
          <Solution />
          <Features />
          <WhyHRBharat />
          <Industries />
          <HowItWorks />
          <ProductShowcase />
          <Testimonials />
          <FAQ />
          <FinalCTA />
        </main>
      </DemoModalProvider>
    </div>
  );
}
