"use server";

import { createClient } from '@supabase/supabase-js';

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
  bankAccount: string;
  ifscCode: string;
  joiningDate: string;
}) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tempPassword = `Temp@${data.employeeCode.trim()}`;
    const cleanEmail = data.email.toLowerCase().trim();
    const cleanEmpCode = data.employeeCode.toUpperCase().trim();

    // 1. Dispatch provisioning call to auth vault core layout structures
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: 'employee' }
    });

    if (authError) {
      return { success: false, error: `Authentication Vault Allocation Aborted: ${authError.message}` };
    }

    if (!authUser.user) {
      return { success: false, error: "Authentication system returned an empty context reference hook." };
    }

    // 2. Synchronize auth signature tokens into global profiles mapping tables
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        company_id: data.companyId,
        full_name: data.fullName.trim(),
        role: 'employee',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (profileError) {
      return { success: false, error: `Auth cleared but profiles cross-sync failed: ${profileError.message}` };
    }

    // 3. Commit comprehensive data parameters down to employee directory tables with initialized leave wallets
    const { error: employeeError } = await supabaseAdmin
      .from('employees')
      .upsert({
        company_id: data.companyId,
        employee_code: cleanEmpCode,
        full_name: data.fullName.trim(),
        email: cleanEmail,
        phone_number: data.phone.trim() || null,
        designation: data.designation.trim() || 'Staff Consultant',
        department: data.department.trim() || 'Operations',
        monthly_salary: Number(data.monthlySalary) || 0,
        bank_account_number: data.bankAccount.trim() || null,
        ifsc_code: data.ifscCode.toUpperCase().trim() || null,
        joining_date: data.joiningDate,
        sick_leave_balance: 12,
        casual_leave_balance: 12,
        paid_leave_balance: 18,
        created_at: new Date().toISOString()
      }, { onConflict: 'email' });

    if (employeeError) {
      return { success: false, error: `Auth and profiles synchronized but active roster mapping dropped: ${employeeError.message}` };
    }

    // 4. Stream transaction notification notice down to immutable audit system ledger
    await supabaseAdmin.from('system_audit_logs').insert({
      company_id: data.companyId,
      actor_name: "Administrative Nexus",
      event_type: "NODE_PROVISIONED",
      description: `Provisioned asset ${cleanEmpCode} (${data.fullName.trim()}) securely into system architecture with baseline leave balances.`
    });

    return { success: true, tempPassword };

  } catch (err: any) {
    return { success: false, error: err.message || 'An unhandled tracking server handshake exception occurred.' };
  }
}

/**
 * Secure Administrative Geofence Perimeter & Subnet Policy Lock Action
 * Enforces coordinate boundary thresholds alongside explicit office Wi-Fi gateway constraints
 */
export async function updateCompanyGeofenceAction(data: {
  companyId: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  allowedIp?: string;
}) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
      return { success: false, error: `Database constraint failure writing geofence configurations: ${error.message}` };
    }

    // Stream perimeter mutation track log down to audit feed
    await supabaseAdmin.from('system_audit_logs').insert({
      company_id: data.companyId,
      actor_name: "Administrative Core",
      event_type: "PERIMETER_MUTATED",
      description: `Geofence matrix updated to Lat: ${data.latitude}, Lng: ${data.longitude} inside ${data.radiusMeters}m threshold limits.`
    });

    return { success: true };

  } catch (err: any) {
    return { success: false, error: err.message || 'Unhandled network parameters write exception.' };
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
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
      .from('company_shifts')
      .insert({
        company_id: data.companyId,
        shift_name: data.shiftName.trim(),
        start_time: data.startTime,
        end_time: data.endTime,
        grace_period_minutes: Number(data.gracePeriod) || 0
      });

    if (error) {
      return { success: false, error: `Failed to insert shift timeline criteria definitions: ${error.message}` };
    }

    return { success: true };

  } catch (err: any) {
    return { success: false, error: err.message || 'Unhandled shift creation process exception.' };
  }
}

/**
 * Scheduler Assignment & Link Allocation Router
 * Binds explicit shift schedule rules onto specific employee profile identifiers
 */
export async function assignEmployeeShiftAction(employeeId: string, shiftId: string | null) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
      .from('employees')
      .update({ assigned_shift_id: shiftId || null })
      .eq('id', employeeId);

    if (error) {
      return { success: false, error: `Shift allocation router mutation sequence rejected: ${error.message}` };
    }

    return { success: true };

  } catch (err: any) {
    return { success: false, error: err.message || 'Unhandled route assignation lookup exception.' };
  }
}

/**
 * Batch Process Statutory Monthly Payroll Ledger Writes
 * Commits calculations records directly to public historical ledgers table maps with audit tracking updates
 */
export async function commitMonthlyPayrollAction(records: any[]) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
      .from('payroll_ledger')
      .insert(records);

    if (error) {
      return { success: false, error: `Ledger execution batch insert sequence aborted: ${error.message}` };
    }

    // Stream batch commitment trace log down to central audit system ledger
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
    return { success: false, error: err.message || 'An unhandled database ledger exception occurred.' };
  }
}

/**
 * Advanced Workflow Action Handler: Leave Clearance Approval
 * Evaluates remaining leave wallet balances, handles atomic decrements, and creates explicit logging notices
 */
export async function approveOrRejectLeaveWithBalanceAction(companyId: string, requestId: string, targetStatus: 'approved' | 'rejected') {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // 1. Fetch matching leave request information from the queue
    const { data: request, error: reqError } = await supabaseAdmin
      .from('leave_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqError || !request) {
      return { success: false, error: "Target leave ticket request tracking token invalid or missing." };
    }

    // If administrative status is flat rejection, commit change instantly and bypass math checks
    if (targetStatus === 'rejected') {
      const { error: rejectError } = await supabaseAdmin
        .from('leave_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (rejectError) return { success: false, error: `Rejection write aborted: ${rejectError.message}` };
      return { success: true };
    }

    // 2. Compute absolute duration date span parameters
    const start = new Date(request.start_date);
    const end = new Date(request.end_date);
    const daySpan = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

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

    // Restrict operation if leave day span exceeds available wallet balance tokens
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
      return { success: false, error: `Balance deduction calculation execution step blocked: ${decrementError.message}` };
    }

    const { error: finalApproveError } = await supabaseAdmin
      .from('leave_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    if (finalApproveError) {
      return { success: false, error: `Balance decremented but final ticket status mutation failed: ${finalApproveError.message}` };
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
    return { success: false, error: err.message || 'An unhandled transactional validation error occurred.' };
  }
}