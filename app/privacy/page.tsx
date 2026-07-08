"use client";

export default function PrivacyPolicy() {
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
          <span className="font-medium">Privacy Policy</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-12 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-[#9b9a97]">Last updated: June 2025</p>
        </div>

        <hr className="border-[#e9e9e7]" />

        {[
          {
            title: "1. Introduction",
            content: `HRBharath ("we", "our", or "us") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our workforce management platform at hrbharath.vercel.app.`,
          },
          {
            title: "2. Information We Collect",
            content: `We collect the following types of information:
• Account Information: Name, email address, phone number, and company details provided during registration.
• Employee Data: Attendance records, salary details, leave requests, and other HR-related information entered by you or your employees.
• Payment Information: Billing details processed securely through Cashfree Payments. We do not store card numbers or sensitive payment data.
• Usage Data: Log data, IP addresses, browser type, and pages visited for security and analytics purposes.`,
          },
          {
            title: "3. How We Use Your Information",
            content: `We use your information to:
• Provide and maintain the HRBharath platform and its features.
• Process payments and manage your subscription.
• Send important service notifications and updates.
• Improve our platform based on usage patterns.
• Comply with legal obligations under Indian law.`,
          },
          {
            title: "4. Data Sharing",
            content: `We do not sell your personal data. We share data only with:
• Cashfree Payments: For secure payment processing.
• Supabase: For secure cloud database storage.
• Legal authorities: When required by Indian law or court order.`,
          },
          {
            title: "5. Data Security",
            content: `We implement industry-standard security measures including encrypted data transmission (HTTPS), secure cloud storage, and access controls to protect your information from unauthorized access.`,
          },
          {
            title: "6. Data Retention",
            content: `We retain your data for as long as your account is active or as required by law. Upon account deletion, your data will be removed within 30 days, except where retention is required for legal compliance.`,
          },
          {
            title: "7. Your Rights",
            content: `You have the right to:
• Access the personal data we hold about you.
• Request correction of inaccurate data.
• Request deletion of your account and associated data.
• Withdraw consent for data processing at any time.
To exercise these rights, contact us at gokulgopakumar5556@gmail.com.`,
          },
          {
            title: "8. Cookies",
            content: `We use essential cookies to keep you logged in and maintain session security. We do not use third-party advertising cookies.`,
          },
          {
            title: "9. Changes to This Policy",
            content: `We may update this Privacy Policy periodically. We will notify you of significant changes via email or a notice on our platform.`,
          },
          {
            title: "10. Contact Us",
            content: `For any privacy-related concerns, contact us at:\nEmail: gokulgopakumar5556@gmail.com`,
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