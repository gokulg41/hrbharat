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
        <p className="text-sm text-ink-400">Loading billing…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-ink-900">

      {/* Header */}
      <header className="border-b border-border-subtle sticky top-0 z-40 bg-white">
        <div className="max-w-4xl mx-auto px-8 h-12 flex items-center gap-1.5 text-sm">
          <div className="w-5 h-5 rounded bg-ink-900 flex items-center justify-center shrink-0">
            <span className="text-white text-[8px] font-bold">HB</span>
          </div>
          <span className="text-ink-400">/</span>
          <Link href="/admin/settings" className="text-ink-600 hover:text-ink-900 transition-colors">Settings</Link>
          <span className="text-ink-400">/</span>
          <span className="font-medium">Billing</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-10 space-y-10">

        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Plan</h1>
          <p className="mt-1 text-sm text-ink-400">
            Manage your subscription and upgrade your plan.
          </p>
        </div>

        {error && (
          <div className="text-sm px-4 py-2.5 rounded-md border bg-status-danger-bg border-status-danger/30 text-status-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <hr className="border-border-subtle" />

        {/* Current plan summary */}
        <div>
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Current Plan
          </p>

          {currentPlan ? (
            <div className="border border-border-subtle rounded-lg p-5 space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-ink-900">{currentPlan.name}</span>
                    {isTrialing && (
                      <span className="text-[10px] font-semibold text-status-warning bg-status-warning-bg border border-status-warning/30 px-2 py-0.5 rounded-full">
                        Trial
                      </span>
                    )}
                    {isActive && (
                      <span className="text-[10px] font-semibold text-status-success bg-status-success-bg border border-status-success/30 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink-600">
                    ₹{currentPlan.price.toLocaleString("en-IN")}/mo · {currentPlan.limit}
                  </p>
                </div>

                {/* Trial countdown */}
                {isTrialing && daysLeft !== null && (
                  <div className="flex items-center gap-2 text-sm bg-status-warning-bg border border-status-warning/30 px-4 py-2 rounded-md">
                    <Calendar className="w-4 h-4 text-status-warning" />
                    <span className="text-status-warning font-medium">
                      {daysLeft === 0
                        ? "Trial ends today"
                        : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in trial`}
                    </span>
                  </div>
                )}
              </div>

              {/* Usage */}
              <div className="flex items-center gap-2 text-sm text-ink-600 pt-1 border-t border-border-subtle">
                <Users className="w-4 h-4 text-ink-400" />
                <span>
                  <span className="font-medium text-ink-900">{employeeCount}</span>
                  {" "}of{" "}
                  <span className="font-medium text-ink-900">
                    {tiers.find(t => t.id === company?.plan)?.limit.replace("Up to ", "").replace(" Employees", "")}
                  </span>
                  {" "}employees used
                </span>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-border-subtle rounded-lg p-8 text-center space-y-3">
              <p className="text-sm text-ink-400">No active plan</p>
              <Link
                href="/signup/plan"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-brand hover:bg-brand-hover px-4 py-2 rounded-md transition-colors"
              >
                Choose a plan <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        <hr className="border-border-subtle" />

        {/* All plans */}
        <div>
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-4 flex items-center gap-2">
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
                      ? "border-ink-900 bg-white ring-1 ring-ink-900 cursor-default"
                      : isSelected
                      ? "border-brand bg-white ring-1 ring-brand cursor-pointer"
                      : "border-border-subtle bg-surface-card-hover hover:border-border-hover cursor-pointer"
                  }`}
                >
                  {(tier as any).popular && !isCurrent && (
                    <span className="absolute top-3 right-3 text-[10px] font-semibold text-status-success bg-status-success-bg border border-status-success/30 px-2 py-0.5 rounded-full">
                      Popular
                    </span>
                  )}

                  {isCurrent && (
                    <span className="absolute top-3 right-3 text-[10px] font-semibold text-ink-900 bg-surface-card-hover border border-border-subtle px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}

                  <div>
                    <p className="text-sm font-semibold">{tier.name}</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold">₹{tier.price.toLocaleString("en-IN")}</span>
                      <span className="text-xs text-ink-400">/mo</span>
                    </div>
                    <span className="text-xs font-medium text-ink-600">
                      {tier.limit}
                    </span>
                  </div>

                  <ul className="space-y-2 flex-1">
                    {tier.features.map((f) => (
                      <li key={f.label} className="flex items-start gap-2 text-xs">
                        {f.included
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-status-success shrink-0 mt-0.5" />
                          : <X className="w-3.5 h-3.5 text-ink-400 shrink-0 mt-0.5" />}
                        <span className={f.included ? "text-ink-900" : "text-ink-400"}>
                          {f.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Action button */}
                  {isCurrent ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-ink-400 py-2 border border-border-subtle rounded-md bg-surface-card-hover">
                      <ShieldCheck className="w-3.5 h-3.5" /> Current plan
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUpgrade(tier.id); }}
                      disabled={upgrading}
                      className="w-full flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-md bg-brand text-white hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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

        <hr className="border-border-subtle" />

        {/* Help */}
        <div className="flex items-start gap-3 text-sm text-ink-600">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-ink-400" />
          <p>
            Need help with billing? Email us at{" "}
            <a href="mailto:support@hrbharat.com" className="text-ink-900 underline underline-offset-2 hover:no-underline">
              support@hrbharat.com
            </a>
            . Plan changes take effect immediately.
          </p>
        </div>

      </main>
    </div>
  );
}