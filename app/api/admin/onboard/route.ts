import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role, salary, empCode, branch } = body;

    if (!name || !email || !password || !role || !salary) {
      return NextResponse.json({ error: "Missing required onboarding parameters" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Create a genuine auth user with the temporary password
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, role: 'Employee' }
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || "Auth creation failed" }, { status: 400 });
    }

    // 2. Map their details directly into your public tracking table
    const finalCode = empCode || `HB-${Math.floor(100 + Math.random() * 900)}`;
    const { error: dbError } = await supabaseAdmin
      .from('employees')
      .insert([{
        id: authData.user.id,
        employee_code: finalCode,
        full_name: name,
        email,
        role,
        designation: role,
        department: "Operations",
        base_salary: Number(salary),
        monthly_salary: Number(salary),
        branch_name: branch || "Main Corporate Center",
        date_of_joining: new Date().toISOString().split('T')[0],
        joining_date: new Date().toISOString().split('T')[0]
      }]);

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Framework Failure" }, { status: 500 });
  }
}