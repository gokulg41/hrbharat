// lib/usePlan.ts
// ─────────────────────────────────────────────────────────────────────────────
// Hook that fetches the current company's active plan and returns feature flags.
// Usage:
//   const { plan, features, loading } = usePlan();
//   if (!features.advanceSalary) return <PlanGate feature="advanceSalary" />;
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PLANS, type PlanId, type PlanFeatures } from "@/lib/plans";

interface UsePlanResult {
  plan: PlanId;
  features: PlanFeatures;
  loading: boolean;
  withinEmployeeLimit: (currentCount: number) => boolean;
}

export function usePlan(): UsePlanResult {
  const [plan, setPlan] = useState<PlanId>("none");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Get company plan via profiles → companies join
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .single();

        if (!profile?.company_id) { setLoading(false); return; }

        const { data: company } = await supabase
          .from("companies")
          .select("plan, subscription_status, trial_ends_at")
          .eq("id", profile.company_id)
          .single();

        if (company) {
          // Treat trialing as active — still has full plan access
          const isActive =
            company.subscription_status === "active" ||
            company.subscription_status === "trialing";

          if (isActive && company.plan) {
            setPlan(company.plan as PlanId);
          } else {
            setPlan("none");
          }
        }
      } catch (err) {
        console.error("usePlan error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPlan();
  }, []);

  return {
    plan,
    features: PLANS[plan],
    loading,
    withinEmployeeLimit: (count: number) => count < PLANS[plan].maxEmployees,
  };
}
