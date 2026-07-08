"use client";

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-white font-sans text-[#37352f]">
      <header className="border-b border-[#e9e9e7] sticky top-0 z-40 bg-white">
        <div className="max-w-3xl mx-auto px-8 h-12 flex items-center gap-1.5 text-sm">
          <a href="/" className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-[#37352f] flex items-center justify-center shrink-0">
              <span className="text-white text-[8px] font-bold">HB</span>
            </div>
          </a>
          <span className="text-[#c1c0bb]">/</span>
          <span className="font-medium">Terms & Conditions</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-12 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Terms & Conditions</h1>
          <p className="text-sm text-[#9b9a97]">Last updated: June 2025</p>
        </div>

        <hr className="border-[#e9e9e7]" />

        {[
          {
            title: "1. Acceptance of Terms",
            content: `By accessing or using HRBharath ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.`,
          },
          {
            title: "2. Description of Service",
            content: `HRBharath is a cloud-based workforce management SaaS platform designed for Indian SMEs. Our services include attendance tracking, payroll management, leave management, employee self-service, and related HR features.`,
          },
          {
            title: "3. Account Registration",
            content: `To use HRBharath, you must:
• Provide accurate and complete registration information.
• Be authorized to represent your company or organisation.
• Keep your login credentials secure and confidential.
• Notify us immediately of any unauthorised access to your account.`,
          },
          {
            title: "4. Subscription & Trial",
            content: `HRBharath offers a 7-day free trial on all plans. During the trial period, your payment method is saved but not charged. After 7 days, your chosen plan will be billed automatically. You may cancel before the trial ends to avoid any charges.`,
          },
          {
            title: "5. Payment Terms",
            content: `All payments are processed securely via Cashfree Payments. Subscription fees are billed monthly in Indian Rupees (INR). Prices are listed on our pricing page and are subject to change with prior notice.`,
          },
          {
            title: "6. Acceptable Use",
            content: `You agree not to:
• Use the platform for any unlawful purpose.
• Upload false or misleading employee data.
• Attempt to gain unauthorised access to our systems.
• Resell or sublicense access to the platform without written consent.`,
          },
          {
            title: "7. Data Ownership",
            content: `You retain full ownership of all data you upload to HRBharath. We do not claim any rights over your employee data. You are responsible for ensuring the accuracy and legality of the data you enter.`,
          },
          {
            title: "8. Service Availability",
            content: `We aim to maintain 99% uptime but do not guarantee uninterrupted access. We are not liable for downtime caused by maintenance, third-party failures, or events beyond our control.`,
          },
          {
            title: "9. Termination",
            content: `We reserve the right to suspend or terminate your account if you violate these Terms. You may cancel your account at any time by contacting us at gokulgopakumar5556@gmail.com.`,
          },
          {
            title: "10. Limitation of Liability",
            content: `HRBharath is not liable for any indirect, incidental, or consequential damages arising from use of the platform. Our total liability is limited to the amount you paid in the 3 months preceding the claim.`,
          },
          {
            title: "11. Governing Law",
            content: `These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Hyderabad, Telangana.`,
          },
          {
            title: "12. Contact",
            content: `For any questions regarding these Terms, contact us at:\nEmail: gokulgopakumar5556@gmail.com`,
          },
        ].map((section) => (
          <div key={section.title} className="space-y-2">
            <h2 className="text-base font-semibold text-[#37352f]">{section.title}</h2>
            <p className="text-sm text-[#787774] leading-relaxed whitespace-pre-line">
              {section.content}
            </p>
          </div>
        ))}
      </main>

      <footer className="border-t border-[#e9e9e7] mt-16">
        <div className="max-w-3xl mx-auto px-8 py-6 text-xs text-[#9b9a97]">
          © {new Date().getFullYear()} HRBharath. All rights reserved.
        </div>
      </footer>
    </div>
  );
}