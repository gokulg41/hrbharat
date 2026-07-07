"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CASHFREE_MODE } from "@/lib/config";
import { CheckCircle2, Loader2, ShieldCheck, Zap, X } from "lucide-react";

const tiers = [
  {
    id: "starter",
    name: "Starter",
    price: 999,
    limit: "Up to 10 Employees",
    desc: "Everything you need to get started.",
    color: "#787774",
    features: [
      { label: "Attendance with selfie + geo check-in", included: true },
      { label: "Basic salary slips (gross, PF, PT)", included: true },
      { label: "Leave requests & approvals", included: true },
      { label: "Employee self-service portal", included: true },
      { label: "1 admin account", included: true },
      { label: "Email support", included: true },
      { label: "Advance salary requests", included: false },
      { label: "Attendance regularisation", included: false },
      { label: "Daily tasks & EOD reports", included: false },
      { label: "Payroll ledger history", included: false },
      { label: "Bulk payroll export", included: false },
      { label: "Shift management", included: false },
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 1999,
    limit: "Up to 30 Employees",
    desc: "For growing teams that need more control.",
    color: "#2eaadc",
    popular: true,
    features: [
      { label: "Everything in Starter", included: true },
      { label: "Advance salary requests", included: true },
      { label: "Attendance regularisation", included: true },
      { label: "Daily task assignment", included: true },
      { label: "EOD reports", included: true },
      { label: "Department & designation management", included: true },
      { label: "Payroll ledger history", included: true },
      { label: "3 admin accounts", included: true },
      { label: "Priority email support", included: true },
      { label: "Bulk payroll export", included: false },
      { label: "Custom geofence per branch", included: false },
      { label: "Shift management", included: false },
    ],
  },
  {
    id: "business",
    name: "Business",
    price: 3999,
    limit: "Up to 75 Employees",
    desc: "Full power for established operations.",
    color: "#0f7b43",
    features: [
      { label: "Everything in Growth", included: true },
      { label: "Bulk payroll export (Excel & PDF)", included: true },
      { label: "Custom geofence per branch", included: true },
      { label: "Shift management", included: true },
      { label: "ESIC deduction tracking", included: true },
      { label: "Compliance reminders (PF due dates)", included: true },
      { label: "Unlimited admin accounts", included: true },
      { label: "Dedicated WhatsApp support", included: true },
    ],
  },
];

function PlanSelectionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const [selected, setSelected] = useState<string>("growth");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const planParam = searchParams.get("plan");
    if (planParam && tiers.find((t) => t.id === planParam)) {
      setSelected(planParam);
    }
  }, [searchParams]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/login");
      else setUser(user);
    });
  }, [router]);

  const handleStartTrial = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const tier = tiers.find((t) => t.id === selected)!;

      const res = await fetch("/api/cashfree/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: tier.id,
          amount: tier.price,
          userId: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email,
        }),
      });

      const data = await res.json();
      console.log("API response:", data);
      if (!res.ok) throw new Error(data.error || "Failed to create order");

      const { load } = await import("@cashfreepayments/cashfree-js");
      const cashfree = await load({
  mode: CASHFREE_MODE,
      });

      cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        redirectTarget: "_self",
      });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const selectedTier = tiers.find((t) => t.id === selected)!;

  return (
    <div className="min-h-screen bg-white font-sans text-[#37352f]">

      {/* Header */}
      <header className="border-b border-[#e9e9e7] sticky top-0 z-40 bg-white">
        <div className="max-w-5xl mx-auto px-8 h-12 flex items-center gap-1.5 text-sm">
          <div className="w-5 h-5 rounded bg-[#37352f] flex items-center justify-center shrink-0">
            <span className="text-white text-[8px] font-bold">HB</span>
          </div>
          <span className="text-[#c1c0bb]">/</span>
          <span className="font-medium">Choose a plan</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-12 space-y-10">

        {/* Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0f7b43] bg-[#edfbf3] border border-[#b7ebcf] px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            7-day free trial · No credit card charged today
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Pick your plan</h1>
          <p className="text-sm text-[#9b9a97]">
            Start free for 7 days. Only billed after your trial ends. Cancel anytime.
          </p>
        </div>

        <hr className="border-[#e9e9e7]" />

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {tiers.map((tier) => {
            const isSelected = selected === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => setSelected(tier.id)}
                className={`relative text-left rounded-lg border p-5 transition-all cursor-pointer flex flex-col gap-4 ${
                  isSelected
                    ? "border-[#37352f] bg-white shadow-sm ring-1 ring-[#37352f]"
                    : "border-[#e9e9e7] bg-[#f7f6f3] hover:border-[#c1c0bb]"
                }`}
              >
                {/* Popular badge */}
                {tier.popular && (
                  <span className="absolute top-3 right-3 text-[10px] font-semibold text-[#0f7b43] bg-[#edfbf3] border border-[#b7ebcf] px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                )}

                {/* Radio */}
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  isSelected ? "border-[#37352f] bg-[#37352f]" : "border-[#c1c0bb]"
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>

                {/* Price */}
                <div>
                  <p className="text-sm font-semibold text-[#37352f]">{tier.name}</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-[#37352f]">
                      ₹{tier.price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-[#9b9a97]">/mo</span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: tier.color }}>
                    {tier.limit}
                  </span>
                </div>

                <p className="text-xs text-[#787774] leading-relaxed">{tier.desc}</p>

                {/* Feature list */}
                <ul className="space-y-2 flex-1">
                  {tier.features.map((f) => (
                    <li key={f.label} className="flex items-start gap-2 text-xs">
                      {f.included ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0f7b43] shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-[#c1c0bb] shrink-0 mt-0.5" />
                      )}
                      <span className={f.included ? "text-[#37352f]" : "text-[#c1c0bb]"}>
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {/* Trial explainer */}
        <div className="bg-[#f7f6f3] border border-[#e9e9e7] rounded-lg px-5 py-4 flex items-start gap-3">
          <Zap className="w-4 h-4 text-[#9b9a97] shrink-0 mt-0.5" />
          <div className="text-sm text-[#787774]">
            <p className="font-medium text-[#37352f] mb-0.5">How the 7-day trial works</p>
            <p>
              Your card is saved securely but{" "}
              <strong className="text-[#37352f] font-medium">not charged</strong> until day 8.
              Cancel any time before that at zero cost. After the trial you get full access to all{" "}
              <strong className="text-[#37352f] font-medium">{selectedTier.name}</strong> features.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm px-4 py-2.5 rounded-md border bg-[#fdecea] border-[#f5c0bb] text-[#d44c47]">
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleStartTrial}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium py-3 rounded-md bg-[#37352f] text-white hover:bg-[#2d2c28] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Setting up your trial…</>
          ) : (
            <>
              Start 7-day free trial · {selectedTier.name} ·{" "}
              ₹{selectedTier.price.toLocaleString("en-IN")}/mo after trial
            </>
          )}
        </button>

        <p className="text-center text-xs text-[#9b9a97]">
          Secured by Cashfree · Payments are encrypted · Cancel anytime
        </p>

      </main>
    </div>
  );
}

export default function PlanSelectionPage() {
  return (
    <Suspense>
      <PlanSelectionForm />
    </Suspense>
  );
}
