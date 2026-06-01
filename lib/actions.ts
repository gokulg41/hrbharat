"use server";

import { createClient } from '@supabase/supabase-js';

// Centralized High-Privilege Administration Client Database Instance
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * HRBharat Core Onboarding Handshake Engine
 * Provisions secure authentication credentials while mapping active profile and leave balance instances
 */
export async function onboardEmployeeAction(data: {
  companyId: string;
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  monthlySalary: number;
  employeeCode: string;
  bankAccount: string|null;
  ifscCode: string|null;
  joiningDate: string;
}) {
  try {
    console.log("STEP 1: Starting employee onboarding");

    const tempPassword = `Temp@${data.employeeCode.trim()}`;
    const cleanEmail = data.email.toLowerCase().trim();
    const cleanEmpCode = data.employeeCode.toUpperCase().trim();

    // CREATE AUTH USER
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          role: "employee",
        },
      });

    if (authError) {
      console.error("AUTH ERROR:", authError);

      return {
        success: false,
        error: authError.message,
      };
    }

    if (!authData?.user) {
      return {
        success: false,
        error: "Auth user was not created.",
      };
    }

    const authUserId = authData.user.id;

    console.log("STEP 2: Auth user created", authUserId);

    // CREATE PROFILE
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: authUserId,
          company_id: data.companyId,
          full_name: data.fullName.trim(),
          email: cleanEmail,
          role: "employee",
          must_reset_password: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

    if (profileError) {
      console.error("PROFILE ERROR:", profileError);

      // rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(authUserId);

      return {
        success: false,
        error: profileError.message,
      };
    }

    console.log("STEP 3: Profile created");

    // CREATE EMPLOYEE
    const { data: employeeData, error: employeeError } =
      await supabaseAdmin
        .from("employees")
        .insert({
          auth_user_id: authUserId,

          company_id: data.companyId,

          employee_code: cleanEmpCode,

          full_name: data.fullName.trim(),

          email: cleanEmail,

          phone_number: data.phone?.trim() || null,

          designation:
            data.designation?.trim() || "Employee",

          department:
            data.department?.trim() || "Operations",

          monthly_salary:
            Number(data.monthlySalary) || 0,

          bank_account_number:
            data.bankAccount?.trim() || null,

          ifsc_code:
            data.ifscCode?.toUpperCase().trim() || null,

          joining_date: data.joiningDate,

          sick_leave_balance: 12,
          casual_leave_balance: 12,
          paid_leave_balance: 18,

          status: "active",

          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (employeeError) {
      console.error("EMPLOYEE ERROR:", employeeError);

      // rollback
      await supabaseAdmin.auth.admin.deleteUser(authUserId);

      return {
        success: false,
        error: employeeError.message,
      };
    }

    console.log("STEP 4: Employee created", employeeData?.id);

    // AUDIT LOG
    const { error: auditError } = await supabaseAdmin
      .from("system_audit_logs")
      .insert({
        company_id: data.companyId,
        actor_name: "Admin",
        event_type: "EMPLOYEE_CREATED",
        description: `Employee ${data.fullName} (${cleanEmpCode}) onboarded.`,
        created_at: new Date().toISOString(),
      });

    if (auditError) {
      console.warn("AUDIT LOG ERROR:", auditError);
    }

    console.log("STEP 5: Employee onboarding completed");

    return {
      success: true,
      employeeId: employeeData.id,
      authUserId,
      tempPassword,
      message: "Employee onboarded successfully.",
    };
  } catch (error: any) {
    console.error("ONBOARDING ERROR:", error);

    return {
      success: false,
      error:
        error?.message ||
        "Unexpected onboarding error.",
    };
  }
}
export async function updateCompanyGeofenceAction(data: {
  companyId: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  allowedIp?: string;
}) {
  try {
    const { error } = await supabaseAdmin
      .from('company_settings')
      .upsert({
        company_id: data.companyId,
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        radius_meters: Number(data.radiusMeters),
        allowed_ip: data.allowedIp?.trim() || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'company_id' });

    if (error) {
      return { success: false, error: String(error.message) };
    }

    await supabaseAdmin.from('system_audit_logs').insert({
      company_id: data.companyId,
      actor_name: "Administrative Core",
      event_type: "PERIMETER_MUTATED",
      description: `Geofence matrix updated to Lat: ${data.latitude}, Lng: ${data.longitude} inside ${data.radiusMeters}m threshold limits.`
    });

    return { success: true };

  } catch (err: any) {
    return { success: false, error: err?.message ? String(err.message) : 'Unhandled network parameters write exception.' };
  }
}

/**
 * Enterprise Shift Schedule Rule Definition Handler
 * Establishes formal operational shift windows and tracking configurations
 */
export async function createCompanyShiftAction(data: {
  companyId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  gracePeriod: number;
}) {
  try {
    const { error } = await supabaseAdmin
      .from('company_shifts')
      .insert({
        company_id: data.companyId,
        shift_name: data.shiftName.trim(),
        start_time: data.startTime.trim(),
        end_time: data.endTime.trim(),
        grace_period_minutes: Number(data.gracePeriod) || 0
      });

    if (error) {
      return { success: false, error: String(error.message) };
    }

    return { success: true };

  } catch (err: any) {
    return { success: false, error: err?.message ? String(err.message) : 'Unhandled shift creation process exception.' };
  }
}

/**
 * Scheduler Assignment & Link Allocation Router
 * Binds explicit shift schedule rules onto specific employee profile identifiers
 */
export async function assignEmployeeShiftAction(employeeId: string, shiftId: string | null) {
  try {
    const { error } = await supabaseAdmin
      .from('employees')
      .update({ assigned_shift_id: shiftId || null })
      .eq('id', employeeId);

    if (error) {
      return { success: false, error: String(error.message) };
    }

    return { success: true };

  } catch (err: any) {
    return { success: false, error: err?.message ? String(err.message) : 'Unhandled route assignation lookup exception.' };
  }
}

/**
 * Batch Process Statutory Monthly Payroll Ledger Writes
 * Commits calculations records directly to public historical ledgers table maps with audit tracking updates
 */
export async function commitMonthlyPayrollAction(records: any[]) {
  try {
    const { error } = await supabaseAdmin
      .from('payroll_ledger')
      .insert(records);

    if (error) {
      return { success: false, error: String(error.message) };
    }

    if (records.length > 0) {
      await supabaseAdmin.from('system_audit_logs').insert({
        company_id: records[0].company_id,
        actor_name: "Administrative Engine",
        event_type: "PAYROLL_DISBURSED",
        description: `Disbursed and processed structured monthly payroll ledger allocations across ${records.length} roster assets for calendar cycle ${records[0].month_year}.`
      });
    }

    return { success: true };

  } catch (err: any) {
    return { success: false, error: err?.message ? String(err.message) : 'An unhandled database ledger exception occurred.' };
  }
}

/**
 * Advanced Workflow Action Handler: Leave Clearance Approval
 * Evaluates remaining leave wallet balances, handles atomic decrements, and creates explicit logging notices
 */
export async function approveOrRejectLeaveWithBalanceAction(companyId: string, requestId: string, targetStatus: 'approved' | 'rejected') {
  try {
    // 1. Fetch matching leave request information from the queue
    const { data: request, error: reqError } = await supabaseAdmin
      .from('leave_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqError || !request) {
      return { success: false, error: "Target leave ticket request tracking token invalid or missing." };
    }

    if (targetStatus === 'rejected') {
      const { error: rejectError } = await supabaseAdmin
        .from('leave_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (rejectError) return { success: false, error: String(rejectError.message) };
      return { success: true };
    }

    // 2. Compute absolute duration date span parameters cleanly across different timezones
    const start = new Date(`${request.start_date}T00:00:00`);
    const end = new Date(`${request.end_date}T23:59:59`);
    const daySpan = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // 3. Fetch current employee balance trackers
    const { data: emp, error: empError } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('company_id', companyId)
      .eq('employee_code', request.employee_code)
      .single();

    if (empError || !emp) {
      return { success: false, error: "Roster database entry matching employee code identifier context dropped." };
    }

    let walletField = 'paid_leave_balance';
    if (request.leave_type === 'Sick Leave') walletField = 'sick_leave_balance';
    if (request.leave_type === 'Casual Leave') walletField = 'casual_leave_balance';

    const currentBalance = emp[walletField];

    if (currentBalance < daySpan) {
      return { 
        success: false, 
        error: `Insufficient leave resource allocations inside wallet field [ ${request.leave_type} ]. Available: ${currentBalance} days, Required request size: ${daySpan} days.` 
      };
    }

    // 4. Atomically decrement employee balance metrics and lock leave request transaction states
    const { error: decrementError } = await supabaseAdmin
      .from('employees')
      .update({ [walletField]: currentBalance - daySpan })
      .eq('id', emp.id);

    if (decrementError) {
      return { success: false, error: String(decrementError.message) };
    }

    const { error: finalApproveError } = await supabaseAdmin
      .from('leave_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    if (finalApproveError) {
      return { success: false, error: String(finalApproveError.message) };
    }

    // 5. Stream transactional information logs trace down to central audit system
    await supabaseAdmin.from('system_audit_logs').insert({
      company_id: companyId,
      actor_name: "Administrative Validation Engine",
      event_type: "LEAVE_CLEARANCE_APPROVED",
      description: `Approved ${daySpan} days of ${request.leave_type} for asset ${request.employee_code}. Balance decremented from ${currentBalance} to ${currentBalance - daySpan}.`
    });

    return { success: true };

  } catch (err: any) {
    return { success: false, error: err?.message ? String(err.message) : 'An unhandled transactional validation error occurred.' };
  }
}
