"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  CheckCircle2,
  X,
  ShieldCheck,
  Zap,
  Users,
  Calendar,
  AlertCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";

const tiers = [
  {
    id: "starter",
    name: "Starter",
    price: 999,
    limit: "Up to 10 Employees",
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

export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [selectedUpgrade, setSelectedUpgrade] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBilling() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) { setLoading(false); return; }

      const [companyRes, subRes, empRes] = await Promise.all([
        supabase.from("companies").select("*").eq("id", profile.company_id).single(),
        supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("employees").select("id", { count: "exact" }).eq("company_id", profile.company_id),
      ]);

      if (companyRes.data) setCompany(companyRes.data);
      if (subRes.data) setSubscription(subRes.data);
      if (empRes.count !== null) setEmployeeCount(empRes.count);

      setLoading(false);
    }
    loadBilling();
  }, [router]);

  const currentPlan = tiers.find((t) => t.id === company?.plan) || null;
  const trialEndsAt = subscription?.trial_ends_at
    ? new Date(subscription.trial_ends_at)
    : null;
  const isTrialing = company?.subscription_status === "trialing";
  const isActive = company?.subscription_status === "active";
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const handleUpgrade = async (planId: string) => {
    setUpgrading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const tier = tiers.find((t) => t.id === planId)!;

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
      if (!res.ok) throw new Error(data.error || "Failed to create order");

      const { load } = await import("@cashfreepayments/cashfree-js");
      const cashfree = await load({
        mode: (process.env.NEXT_PUBLIC_CASHFREE_MODE as "sandbox" | "production") || "sandbox",
      });

      cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        redirectTarget: "_self",
      });
    } catch (err: any) {
      setError(err.message);
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-[#9b9a97]">Loading billing…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-[#37352f]">

      {/* Header */}
      <header className="border-b border-[#e9e9e7] sticky top-0 z-40 bg-white">
        <div className="max-w-4xl mx-auto px-8 h-12 flex items-center gap-1.5 text-sm">
          <div className="w-5 h-5 rounded bg-[#37352f] flex items-center justify-center shrink-0">
            <span className="text-white text-[8px] font-bold">HB</span>
          </div>
          <span className="text-[#c1c0bb]">/</span>
          <Link href="/admin/settings" className="text-[#787774] hover:text-[#37352f] transition-colors">Settings</Link>
          <span className="text-[#c1c0bb]">/</span>
          <span className="font-medium">Billing</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-10 space-y-10">

        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Plan</h1>
          <p className="mt-1 text-sm text-[#9b9a97]">
            Manage your subscription and upgrade your plan.
          </p>
        </div>

        {error && (
          <div className="text-sm px-4 py-2.5 rounded-md border bg-[#fdecea] border-[#f5c0bb] text-[#d44c47] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <hr className="border-[#e9e9e7]" />

        {/* Current plan summary */}
        <div>
          <p className="text-xs font-semibold text-[#9b9a97] uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Current Plan
          </p>

          {currentPlan ? (
            <div className="border border-[#e9e9e7] rounded-lg p-5 space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[#37352f]">{currentPlan.name}</span>
                    {isTrialing && (
                      <span className="text-[10px] font-semibold text-[#d97706] bg-[#fef3c7] border border-[#fde68a] px-2 py-0.5 rounded-full">
                        Trial
                      </span>
                    )}
                    {isActive && (
                      <span className="text-[10px] font-semibold text-[#0f7b43] bg-[#edfbf3] border border-[#b7ebcf] px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#787774]">
                    ₹{currentPlan.price.toLocaleString("en-IN")}/mo · {currentPlan.limit}
                  </p>
                </div>

                {/* Trial countdown */}
                {isTrialing && daysLeft !== null && (
                  <div className="flex items-center gap-2 text-sm bg-[#fef3c7] border border-[#fde68a] px-4 py-2 rounded-md">
                    <Calendar className="w-4 h-4 text-[#d97706]" />
                    <span className="text-[#92400e] font-medium">
                      {daysLeft === 0
                        ? "Trial ends today"
                        : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in trial`}
                    </span>
                  </div>
                )}
              </div>

              {/* Usage */}
              <div className="flex items-center gap-2 text-sm text-[#787774] pt-1 border-t border-[#e9e9e7]">
                <Users className="w-4 h-4 text-[#c1c0bb]" />
                <span>
                  <span className="font-medium text-[#37352f]">{employeeCount}</span>
                  {" "}of{" "}
                  <span className="font-medium text-[#37352f]">
                    {tiers.find(t => t.id === company?.plan)?.limit.replace("Up to ", "").replace(" Employees", "")}
                  </span>
                  {" "}employees used
                </span>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-[#e9e9e7] rounded-lg p-8 text-center space-y-3">
              <p className="text-sm text-[#9b9a97]">No active plan</p>
              <Link
                href="/signup/plan"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-[#37352f] hover:bg-[#2d2c28] px-4 py-2 rounded-md transition-colors"
              >
                Choose a plan <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        <hr className="border-[#e9e9e7]" />

        {/* All plans */}
        <div>
          <p className="text-xs font-semibold text-[#9b9a97] uppercase tracking-widest mb-4 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" /> {currentPlan ? "Upgrade Plan" : "Choose a Plan"}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((tier) => {
              const isCurrent = company?.plan === tier.id;
              const isSelected = selectedUpgrade === tier.id;

              return (
                <div
                  key={tier.id}
                  onClick={() => !isCurrent && setSelectedUpgrade(tier.id)}
                  className={`relative rounded-lg border p-5 flex flex-col gap-4 transition-all ${
                    isCurrent
                      ? "border-[#37352f] bg-white ring-1 ring-[#37352f] cursor-default"
                      : isSelected
                      ? "border-[#2eaadc] bg-white ring-1 ring-[#2eaadc] cursor-pointer"
                      : "border-[#e9e9e7] bg-[#f7f6f3] hover:border-[#c1c0bb] cursor-pointer"
                  }`}
                >
                  {(tier as any).popular && !isCurrent && (
                    <span className="absolute top-3 right-3 text-[10px] font-semibold text-[#0f7b43] bg-[#edfbf3] border border-[#b7ebcf] px-2 py-0.5 rounded-full">
                      Popular
                    </span>
                  )}

                  {isCurrent && (
                    <span className="absolute top-3 right-3 text-[10px] font-semibold text-[#37352f] bg-[#f7f6f3] border border-[#e9e9e7] px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}

                  <div>
                    <p className="text-sm font-semibold">{tier.name}</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold">₹{tier.price.toLocaleString("en-IN")}</span>
                      <span className="text-xs text-[#9b9a97]">/mo</span>
                    </div>
                    <span className="text-xs font-medium" style={{ color: tier.color }}>
                      {tier.limit}
                    </span>
                  </div>

                  <ul className="space-y-2 flex-1">
                    {tier.features.map((f) => (
                      <li key={f.label} className="flex items-start gap-2 text-xs">
                        {f.included
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-[#0f7b43] shrink-0 mt-0.5" />
                          : <X className="w-3.5 h-3.5 text-[#c1c0bb] shrink-0 mt-0.5" />}
                        <span className={f.included ? "text-[#37352f]" : "text-[#c1c0bb]"}>
                          {f.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Action button */}
                  {isCurrent ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-[#9b9a97] py-2 border border-[#e9e9e7] rounded-md bg-[#f7f6f3]">
                      <ShieldCheck className="w-3.5 h-3.5" /> Current plan
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUpgrade(tier.id); }}
                      disabled={upgrading}
                      className="w-full flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-md bg-[#37352f] text-white hover:bg-[#2d2c28] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {upgrading && selectedUpgrade === tier.id
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</>
                        : currentPlan && tier.price > currentPlan.price
                        ? <>Upgrade to {tier.name}</>
                        : <>Switch to {tier.name}</>
                      }
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <hr className="border-[#e9e9e7]" />

        {/* Help */}
        <div className="flex items-start gap-3 text-sm text-[#787774]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#c1c0bb]" />
          <p>
            Need help with billing? Email us at{" "}
            <a href="mailto:support@hrbharat.com" className="text-[#37352f] underline underline-offset-2 hover:no-underline">
              support@hrbharat.com
            </a>
            . Plan changes take effect immediately.
          </p>
        </div>

      </main>
    </div>
  );
}