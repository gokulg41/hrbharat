"use client";

export default function RefundPolicy() {
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
          <span className="font-medium">Refund & Cancellation Policy</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-12 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Refund & Cancellation Policy</h1>
          <p className="text-sm text-[#9b9a97]">Last updated: June 2025</p>
        </div>

        <hr className="border-[#e9e9e7]" />

        {/* Highlight box */}
        <div className="bg-[#edfbf3] border border-[#b7ebcf] rounded-lg px-5 py-4">
          <p className="text-sm text-[#0f7b43] font-medium">
            HRBharath offers a 7-day free trial on all plans — your card is saved but never charged during the trial period. You can cancel anytime before day 8 at zero cost.
          </p>
        </div>

        {[
          {
            title: "1. Free Trial Policy",
            content: `All HRBharath plans include a 7-day free trial. During this period:
• Your payment method is securely saved via Cashfree Payments.
• You will not be charged any amount during the 7-day trial.
• You get full access to all features of your chosen plan.
• You may cancel at any time before the trial ends without incurring any charges.`,
          },
          {
            title: "2. Cancellation During Trial",
            content: `If you cancel your subscription before the 7-day trial period ends:
• No payment will be collected.
• Your account will remain active until the end of the trial period.
• No cancellation fee applies.

To cancel, contact us at gokulgopakumar5556@gmail.com before day 8 of your trial.`,
          },
          {
            title: "3. Cancellation After Trial",
            content: `If you cancel after the trial period has ended and your first payment has been processed:
• Your subscription will remain active until the end of the current billing cycle.
• No further charges will be made after cancellation.
• We do not offer refunds for the current billing cycle once payment has been processed.`,
          },
          {
            title: "4. Refund Policy",
            content: `As we provide a 7-day free trial to allow you to evaluate the platform before being charged, we generally do not offer refunds after the trial period ends and billing has commenced.

Exceptions may be considered in the following cases:
• You were charged in error due to a technical fault on our end.
• Duplicate payment was made for the same subscription cycle.
• Service was completely unavailable for more than 72 consecutive hours due to our fault.

To raise a refund request under these exceptions, contact us within 7 days of the charge at gokulgopakumar5556@gmail.com with your order ID and reason.`,
          },
          {
            title: "5. Refund Processing",
            content: `Approved refunds will be processed within 5–7 business days and credited back to the original payment method used at the time of purchase. Cashfree Payments processes all refunds and timelines may vary slightly based on your bank.`,
          },
          {
            title: "6. Plan Downgrades",
            content: `If you downgrade to a lower plan mid-cycle, the change will take effect from the next billing cycle. No partial refunds are issued for the difference in plan pricing within the current cycle.`,
          },
          {
            title: "7. Account Deletion",
            content: `Deleting your account does not automatically cancel your subscription. Please contact us to cancel your subscription before deleting your account to avoid further charges.`,
          },
          {
            title: "8. Contact for Refunds & Cancellations",
            content: `For any refund or cancellation requests, reach us at:\nEmail: gokulgopakumar5556@gmail.com\n\nPlease include your registered email address and Cashfree order ID in your request for faster resolution.`,
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