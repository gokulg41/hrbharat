import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, ownerName, email, password, branch } = body;

    if (!companyName || !ownerName || !email || !password) {
      return NextResponse.json({ error: "Missing required onboarding parameters." }, { status: 400 });
    }

    // Initialize with Service Role privileges to execute the secure RPC function
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Call the native PostgreSQL function we just registered in the database
    const { data: companyCode, error: rpcError } = await supabaseAdmin.rpc(
      'provision_master_company_admin',
      {
        admin_email: email,
        admin_password: password,
        admin_name: ownerName,
        company_name: companyName,
        branch_name: branch || "Main Corporate Center"
      }
    );

    if (rpcError) {
      return NextResponse.json({ error: `Infrastructure Setup Failure: ${rpcError.message}` }, { status: 400 });
    }

    // Return the successfully generated company tracking code to the frontend UI
    return NextResponse.json({ success: true, companyCode });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Failure" }, { status: 500 });
  }
}