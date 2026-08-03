import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Requires the migration at:
//   supabase/migrations/20260803_create_demo_requests.sql
// to have been run against your project before this route will work.

const schema = z.object({
  name: z.string().min(2, "Enter your full name"),
  company: z.string().min(2, "Enter your company name"),
  workEmail: z.string().email("Enter a valid work email"),
  phone: z.string().min(6, "Enter a valid phone number"),
  companySize: z.enum(["1-10", "11-50", "51-200", "200+"], {
    error: "Select a company size",
  }),
  country: z.enum(["India", "UAE", "Other"], {
    error: "Select a country",
  }),
  message: z.string().optional(),
  // Honeypot field: real users never see or fill this (hidden via CSS
  // in the form). If it arrives non-empty, silently drop the submission
  // as spam without letting the bot know it was rejected.
  companyWebsite: z.string().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "We couldn't read that submission. Please try again." },
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        ok: false,
        error: firstIssue?.message ?? "Please check the form and try again.",
        issues: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  // Honeypot tripped -> pretend success, do nothing.
  if (parsed.data.companyWebsite) {
    return NextResponse.json({ ok: true });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(
      "[demo] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
    return NextResponse.json(
      {
        ok: false,
        error:
          "Demo requests can't be saved right now. Please email hello@hrbharat.com and we'll follow up directly.",
      },
      { status: 503 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { name, company, workEmail, phone, companySize, country, message } =
    parsed.data;

  const { data, error } = await supabase
    .from("demo_requests")
    .insert({
      name: name.trim(),
      company: company.trim(),
      work_email: workEmail.trim().toLowerCase(),
      phone: phone.trim(),
      company_size: companySize,
      country,
      message: message?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[demo] Supabase insert failed:", error.message);

    // Table missing entirely -> give an actionable message instead of a generic 500
    if (error.code === "42P01") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Demo request storage isn't set up yet (missing demo_requests table). Run the migration and try again.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "We couldn't save your request. Please try again, or email hello@hrbharat.com directly.",
      },
      { status: 500 }
    );
  }

  // Optional: notify sales by email. Only runs if RESEND_API_KEY and
  // DEMO_NOTIFY_EMAIL are set — otherwise this is a no-op, and a failure
  // here never fails the user's submission (the lead is already saved).
  const resendKey = process.env.RESEND_API_KEY;
  const notifyTo = process.env.DEMO_NOTIFY_EMAIL;
  if (resendKey && notifyTo) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.DEMO_NOTIFY_FROM ?? "HRBharat <onboarding@resend.dev>",
          to: notifyTo,
          subject: `New demo request — ${company}`,
          text: [
            `Name: ${name}`,
            `Company: ${company}`,
            `Work email: ${workEmail}`,
            `Phone: ${phone}`,
            `Company size: ${companySize}`,
            `Country: ${country}`,
            message ? `Message: ${message}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });
    } catch (emailErr) {
      console.error("[demo] Notification email failed (lead still saved):", emailErr);
    }
  }

  return NextResponse.json({ ok: true, id: data?.id });
}