/**
 * HRBharat Core Statutory Indian Payroll Engine Utility
 * Computes exact deductions for EPF, ESIC, and Professional Tax on the fly
 */
export interface PayrollBreakdown {
  gross: number;
  epf: number;
  esic: number;
  profTax: number;
  netHome: number;
}

export function calculateIndianPayrollBreakdown(grossMonthly: number): PayrollBreakdown {
  const gross = Number(grossMonthly) || 0;

  // 1. Employee Provident Fund (EPF) calculation
  // Baseline matching capped statutory wage ceiling limit of ₹15,000 if true, otherwise flat 12%
  const epfBasis = gross > 15000 ? 15000 : gross;
  const epf = Math.round(epfBasis * 0.12);

  // 2. Employee State Insurance (ESIC) calculation
  // Applicable only if the worker's gross salary is less than or equal to ₹21,000/month
  let esic = 0;
  if (gross <= 21000 && gross > 0) {
    esic = Math.round(gross * 0.0075);
  }

  // 3. Professional Tax (PT) deduction mapping
  // Grid tracking standards (₹200 baseline cushion standard average across active states)
  let profTax = 0;
  if (gross > 15000) {
    profTax = 200;
  } else if (gross > 10000) {
    profTax = 150;
  } else if (gross > 7500) {
    profTax = 100;
  }

  // 4. Net Take-Home formulation
  const totalDeductions = epf + esic + profTax;
  const netHome = gross - totalDeductions >= 0 ? gross - totalDeductions : 0;

  return {
    gross,
    epf,
    esic,
    profTax,
    netHome
  };
}