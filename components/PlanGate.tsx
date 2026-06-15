// components/PlanGate.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Wrap any restricted section with <PlanGate feature="advanceSalary">.
// If the current plan doesn't include the feature, shows an upgrade prompt.
// If it does, renders children normally.
//
// Usage:
//   <PlanGate feature="bulkPayrollExport">
//     <BulkExportButton />
//   </PlanGate>
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import React from "react";
import Link from "next/link";
import { Lock, Zap } from "lucide-react";
import { usePlan } from "@/lib/usePlan";
import {
  type PlanFeatures,
  FEATURE_PLAN_REQUIREMENT,
  FEATURE_LABELS,
  PLAN_META,
} from "@/lib/plans";

interface PlanGateProps {
  feature: keyof PlanFeatures;
  children: React.ReactNode;
  // Optional: render a compact inline lock instead of the full card
  inline?: boolean;
}

export default function PlanGate({ feature, children, inline = false }: PlanGateProps) {
  const { features, plan, loading } = usePlan();

  // While loading, render nothing to avoid flash
  if (loading) return null;

  // Feature is available — render normally
  if (features[feature]) return <>{children}</>;

  // Feature is locked — show upgrade prompt
  const requiredPlan = FEATURE_PLAN_REQUIREMENT[feature] ?? "growth";
  const planMeta = PLAN_META[requiredPlan as keyof typeof PLAN_META];
  const featureLabel = FEATURE_LABELS[feature] ?? String(feature);

  if (inline) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-[#9b9a97]">
        <Lock className="w-3 h-3" />
        <span>{featureLabel} — </span>
        <Link
          href="/admin/settings/billing"
          className="text-[#2eaadc] hover:underline font-medium"
        >
          Upgrade to {planMeta.name}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#e9e9e7] bg-[#f7f6f3] p-6 flex flex-col items-center text-center gap-4">
      {/* Lock icon */}
      <div className="w-10 h-10 rounded-full bg-white border border-[#e9e9e7] flex items-center justify-center">
        <Lock className="w-4 h-4 text-[#9b9a97]" />
      </div>

      {/* Message */}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#37352f]">{featureLabel}</p>
        <p className="text-xs text-[#787774] max-w-xs leading-relaxed">
          This feature is available on the{" "}
          <span className="font-medium text-[#37352f]">{planMeta.name} plan</span>{" "}
          and above.
        </p>
      </div>

      {/* Plan badge */}
      <div className="flex items-center gap-2 bg-white border border-[#e9e9e7] rounded-md px-4 py-2.5 text-sm">
        <Zap className="w-4 h-4 text-[#9b9a97]" />
        <span className="text-[#37352f] font-medium">{planMeta.name}</span>
        <span className="text-[#9b9a97]">·</span>
        <span className="text-[#9b9a97]">₹{planMeta.price.toLocaleString("en-IN")}/mo</span>
        <span className="text-[#9b9a97]">·</span>
        <span className="text-xs text-[#9b9a97]">{planMeta.limit}</span>
      </div>

      {/* Upgrade CTA */}
      <Link
        href="/admin/settings/billing"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-[#37352f] hover:bg-[#2d2c28] px-4 py-2 rounded-md transition-colors"
      >
        Upgrade plan
      </Link>

      <p className="text-xs text-[#c1c0bb]">
        Current plan:{" "}
        <span className="capitalize font-medium text-[#9b9a97]">
          {plan === "none" ? "No active plan" : plan}
        </span>
      </p>
    </div>
  );
}
