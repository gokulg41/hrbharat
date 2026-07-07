// app/api/cashfree/verify/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CASHFREE_BASE =
  process.env.CASHFREE_MODE === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

// ── Verify Cashfree webhook signature ─────────────────────────────────
function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string
): boolean {
  try {
    const signedPayload = timestamp + rawBody;
    const expectedSig = crypto
      .createHmac("sha256", process.env.CASHFREE_WEBHOOK_SECRET!)
      .update(signedPayload)
      .digest("base64");
    return expectedSig === signature;
  } catch {
    return false;
  }
}

// ── Activate subscription in Supabase ─────────────────────────────────
async function activateSubscription(cashfreeOrderId: string, paymentId: string) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("user_id, plan_id")
    .eq("cashfree_order_id", cashfreeOrderId)
    .single();

  if (!sub) {
    console.error("No subscription found for order:", cashfreeOrderId);
    return;
  }

  // Mark subscription as trialing
  await supabase
    .from("subscriptions")
    .update({
      status: "trialing",
      cashfree_payment_id: paymentId,
      activated_at: new Date().toISOString(),
    })
    .eq("cashfree_order_id", cashfreeOrderId);

  // Update company plan
  await supabase
    .from("companies")
    .update({
      plan: sub.plan_id,
      subscription_status: "trialing",
      trial_ends_at: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
    })
    .eq("owner_id", sub.user_id);

  console.log("Subscription activated — user:", sub.user_id, "plan:", sub.plan_id);
}

// ── GET: client redirect return from Cashfree checkout ────────────────
// Cashfree redirects to /api/cashfree/verify?order_id=xxx after payment
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("order_id");

  if (!orderId) {
    return NextResponse.redirect(
      new URL("/signup/plan?error=missing_order", req.url)
    );
  }

  try {
    // Fetch order status from Cashfree
    const cfRes = await fetch(`${CASHFREE_BASE}/orders/${orderId}`, {
      method: "GET",
      headers: {
        "x-client-id": process.env.CASHFREE_APP_ID!,
        "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
        "x-api-version": "2023-08-01",
      },
    });

    const cfText = await cfRes.text();
    let order: any;

    try {
      order = JSON.parse(cfText);
    } catch {
      console.error("Cashfree non-JSON response:", cfText);
      return NextResponse.redirect(
        new URL("/signup/plan?error=gateway_error", req.url)
      );
    }

    if (!cfRes.ok) {
      console.error("Cashfree order fetch error:", order);
      return NextResponse.redirect(
        new URL("/signup/plan?error=order_fetch_failed", req.url)
      );
    }

    const isPaid = order.order_status === "PAID";

    if (isPaid) {
      await activateSubscription(orderId, order.cf_order_id?.toString() || orderId);
      return NextResponse.redirect(new URL("/admin?welcome=true", req.url));
    } else {
      console.warn("Payment not completed, status:", order.order_status);
      return NextResponse.redirect(
        new URL(`/signup/plan?error=payment_failed`, req.url)
      );
    }
  } catch (err: any) {
    console.error("verify GET error:", err);
    return NextResponse.redirect(
      new URL("/signup/plan?error=server_error", req.url)
    );
  }
}

// ── POST: Cashfree webhook (server-to-server) ─────────────────────────
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature") || "";
    const timestamp = req.headers.get("x-webhook-timestamp") || "";

    // Verify webhook signature in production only
    if (
      process.env.NEXT_PUBLIC_CASHFREE_MODE === "production" &&
      process.env.CASHFREE_WEBHOOK_SECRET &&
      !verifyWebhookSignature(rawBody, signature, timestamp)
    ) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { type, data } = event;
    console.log("Cashfree webhook received:", type);

    // Payment success
    if (type === "PAYMENT_SUCCESS_WEBHOOK") {
      const orderId = data?.order?.order_id;
      const paymentId = data?.payment?.cf_payment_id?.toString();

      if (orderId && paymentId) {
        await activateSubscription(orderId, paymentId);
      }
    }

    // Payment failure
    if (type === "PAYMENT_FAILED_WEBHOOK") {
      const orderId = data?.order?.order_id;
      if (orderId) {
        await supabase
          .from("subscriptions")
          .update({ status: "failed" })
          .eq("cashfree_order_id", orderId);
        console.log("Payment failed for order:", orderId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("verify POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
