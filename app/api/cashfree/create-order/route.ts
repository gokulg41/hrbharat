import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cashfree environment
const cashfreeMode = process.env.CASHFREE_MODE || "sandbox";

const CASHFREE_BASE =
  cashfreeMode === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

export async function POST(req: NextRequest) {
  try {
    // ── 1. Validate environment variables ─────────────────────────

    if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
      console.error(
        "Missing CASHFREE_APP_ID or CASHFREE_SECRET_KEY in environment"
      );

      return NextResponse.json(
        {
          error:
            "Payment gateway not configured. Please contact support.",
        },
        { status: 500 }
      );
    }

    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.error("Missing NEXT_PUBLIC_APP_URL in environment");

      return NextResponse.json(
        { error: "App URL not configured." },
        { status: 500 }
      );
    }

    // ── 2. Parse request body ─────────────────────────────────────

    let body: any;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const { planId, amount, userId, email, name } = body;

    if (!planId || !amount || !userId || !email) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: planId, amount, userId, email",
        },
        { status: 400 }
      );
    }

    // ── 3. Create Cashfree order ──────────────────────────────────

    const orderId = `hrb_${userId.slice(0, 8)}_${Date.now()}`;

    const payload = {
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      order_note: `HRBharat ${planId} plan - 7-day trial`,

      customer_details: {
        customer_id: userId.slice(0, 50),
        customer_email: email,
        customer_name: (name || email).slice(0, 100),

        // Temporary demo/test phone number.
        // Replace with the actual customer phone when collected.
        customer_phone: "9999999999",
      },

      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/cashfree/verify?order_id={order_id}`,
        notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/cashfree/verify`,
      },

      order_tags: {
        plan_id: planId,
        user_id: userId,
        trial: "true",
      },
    };

    // ── 4. Diagnostic logging ─────────────────────────────────────
    // IMPORTANT:
    // Do NOT log the App ID or Secret Key.

    console.log("========== CASHFREE DEBUG ==========");
    console.log("Order ID:", orderId);
    console.log("CASHFREE_MODE:", cashfreeMode);
    console.log("CASHFREE_BASE:", CASHFREE_BASE);
    console.log(
      "NEXT_PUBLIC_CASHFREE_MODE:",
      process.env.NEXT_PUBLIC_CASHFREE_MODE
    );
    console.log(
      "CASHFREE_APP_ID present:",
      Boolean(process.env.CASHFREE_APP_ID)
    );
    console.log(
      "CASHFREE_SECRET_KEY present:",
      Boolean(process.env.CASHFREE_SECRET_KEY)
    );
    console.log("====================================");

    // ── 5. Call Cashfree ──────────────────────────────────────────

    const cfRes = await fetch(`${CASHFREE_BASE}/orders`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-client-id": process.env.CASHFREE_APP_ID,
        "x-client-secret": process.env.CASHFREE_SECRET_KEY,
        "x-api-version": "2023-08-01",
      },

      body: JSON.stringify(payload),
    });

    // Read response as text first
    const cfText = await cfRes.text();

    let cfData: any;

    try {
      cfData = JSON.parse(cfText);
    } catch {
      console.error("Cashfree non-JSON response:", cfText);

      return NextResponse.json(
        {
          error:
            "Unexpected response from payment gateway. Please try again.",
        },
        { status: 502 }
      );
    }

    // ── 6. Handle Cashfree errors ─────────────────────────────────

    if (!cfRes.ok) {
      console.error("Cashfree HTTP status:", cfRes.status);
      console.error("Cashfree error response:", cfData);

      return NextResponse.json(
        {
          error:
            cfData?.message ||
            cfData?.error ||
            "Payment gateway error. Please try again.",
        },
        { status: 502 }
      );
    }

    // ── 7. Validate payment session ──────────────────────────────

    if (!cfData.payment_session_id) {
      console.error(
        "Cashfree missing payment_session_id:",
        cfData
      );

      return NextResponse.json(
        {
          error:
            "No payment session returned. Check your Cashfree credentials.",
        },
        { status: 502 }
      );
    }

    // ── 8. Store pending subscription ────────────────────────────

    const { error: dbError } = await supabase
      .from("subscriptions")
      .upsert({
        user_id: userId,
        plan_id: planId,
        cashfree_order_id: orderId,
        status: "pending",
        trial_ends_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        created_at: new Date().toISOString(),
      });

    if (dbError) {
      // Non-fatal — payment can still proceed
      console.error(
        "Supabase subscription insert error:",
        dbError.message
      );
    }

    console.log("Cashfree order created successfully:", orderId);

    // ── 9. Return payment session ─────────────────────────────────

    return NextResponse.json({
      order_id: cfData.order_id,
      payment_session_id: cfData.payment_session_id,
    });
  } catch (err: any) {
    console.error(
      "create-order unhandled error:",
      err
    );

    return NextResponse.json(
      {
        error:
          err?.message ||
          "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}
