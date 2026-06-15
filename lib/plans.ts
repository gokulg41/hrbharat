// lib/plans.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all plan limits and feature flags.
// Import this anywhere in the app — never hardcode plan logic elsewhere.
// ─────────────────────────────────────────────────────────────────────────────

export type PlanId = "starter" | "growth" | "business" | "none";

export interface PlanFeatures {
  // Limits
  maxEmployees: number;
  maxAdmins: number;

  // Core features (all plans)
  attendance: boolean;
  basicPayroll: boolean;
  leaveManagement: boolean;
  employeePortal: boolean;

  // Growth+
  advanceSalary: boolean;
  attendanceRegularisation: boolean;
  dailyTasks: boolean;
  eodReports: boolean;
  departmentManagement: boolean;
  payrollLedger: boolean;

  // Business only
  bulkPayrollExport: boolean;
  customGeofence: boolean;
  shiftManagement: boolean;
  esicTracking: boolean;
  complianceReminders: boolean;
  unlimitedAdmins: boolean;

  // Support
  support: "email" | "priority_email" | "whatsapp";
}

export const PLANS: Record<PlanId, PlanFeatures> = {
  none: {
    maxEmployees: 0,
    maxAdmins: 0,
    attendance: false,
    basicPayroll: false,
    leaveManagement: false,
    employeePortal: false,
    advanceSalary: false,
    attendanceRegularisation: false,
    dailyTasks: false,
    eodReports: false,
    departmentManagement: false,
    payrollLedger: false,
    bulkPayrollExport: false,
    customGeofence: false,
    shiftManagement: false,
    esicTracking: false,
    complianceReminders: false,
    unlimitedAdmins: false,
    support: "email",
  },

  starter: {
    maxEmployees: 10,
    maxAdmins: 1,
    attendance: true,
    basicPayroll: true,
    leaveManagement: true,
    employeePortal: true,
    advanceSalary: false,
    attendanceRegularisation: false,
    dailyTasks: false,
    eodReports: false,
    departmentManagement: false,
    payrollLedger: false,
    bulkPayrollExport: false,
    customGeofence: false,
    shiftManagement: false,
    esicTracking: false,
    complianceReminders: false,
    unlimitedAdmins: false,
    support: "email",
  },

  growth: {
    maxEmployees: 30,
    maxAdmins: 3,
    attendance: true,
    basicPayroll: true,
    leaveManagement: true,
    employeePortal: true,
    advanceSalary: true,
    attendanceRegularisation: true,
    dailyTasks: true,
    eodReports: true,
    departmentManagement: true,
    payrollLedger: true,
    bulkPayrollExport: false,
    customGeofence: false,
    shiftManagement: false,
    esicTracking: false,
    complianceReminders: false,
    unlimitedAdmins: false,
    support: "priority_email",
  },

  business: {
    maxEmployees: 75,
    maxAdmins: Infinity,
    attendance: true,
    basicPayroll: true,
    leaveManagement: true,
    employeePortal: true,
    advanceSalary: true,
    attendanceRegularisation: true,
    dailyTasks: true,
    eodReports: true,
    departmentManagement: true,
    payrollLedger: true,
    bulkPayrollExport: true,
    customGeofence: true,
    shiftManagement: true,
    esicTracking: true,
    complianceReminders: true,
    unlimitedAdmins: true,
    support: "whatsapp",
  },
};

// Human-readable plan metadata (used in UI)
export const PLAN_META = {
  starter: {
    name: "Starter",
    price: 999,
    limit: "Up to 10 employees",
    color: "#787774",
  },
  growth: {
    name: "Growth",
    price: 1999,
    limit: "Up to 30 employees",
    color: "#2eaadc",
  },
  business: {
    name: "Business",
    price: 3999,
    limit: "Up to 75 employees",
    color: "#0f7b43",
  },
};

// Which plan unlocks a given feature (used in upgrade prompts)
export const FEATURE_PLAN_REQUIREMENT: Partial<Record<keyof PlanFeatures, PlanId>> = {
  advanceSalary: "growth",
  attendanceRegularisation: "growth",
  dailyTasks: "growth",
  eodReports: "growth",
  departmentManagement: "growth",
  payrollLedger: "growth",
  bulkPayrollExport: "business",
  customGeofence: "business",
  shiftManagement: "business",
  esicTracking: "business",
  complianceReminders: "business",
  unlimitedAdmins: "business",
};

export const FEATURE_LABELS: Partial<Record<keyof PlanFeatures, string>> = {
  advanceSalary: "Advance Salary Requests",
  attendanceRegularisation: "Attendance Regularisation",
  dailyTasks: "Daily Task Assignment",
  eodReports: "EOD Reports",
  departmentManagement: "Department Management",
  payrollLedger: "Payroll Ledger",
  bulkPayrollExport: "Bulk Payroll Export",
  customGeofence: "Custom Geofence per Branch",
  shiftManagement: "Shift Management",
  esicTracking: "ESIC Tracking",
  complianceReminders: "Compliance Reminders",
  unlimitedAdmins: "Unlimited Admin Accounts",
};
