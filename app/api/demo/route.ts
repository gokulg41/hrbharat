import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// TODO(source-verification): this route assumes a `demo_requests` table.
// It has NOT been confirmed to exist in your Supabase project.
// Create it before relying on this route, e.g.:
//
//   create table demo_requests (
//     id uuid primary key default gen_random_uuid(),
//     name text not null,
//     company text not null,
//     work_email text not null,
//     phone text not null,
//     company_size text not null,
//     country text not null,
//     message text,
//     created_at timestamptz not null default now()
//   );
//
// Also requires SUPABASE_SERVICE_ROLE_KEY as a server-only env var
// (do not expose it with the NEXT_PUBLIC_ prefix).

const schema = z.object({
  name: z.string().min(2),
  company: z.string().min(2),
  workEmail: z.string().email(),
  phone: z.string().min(6),
  companySize: z.string().min(1),
  country: z.string().min(1),
  message: z.string().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid submission", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(
      "Demo request received but SUPABASE_SERVICE_ROLE_KEY is not configured."
    );
    return NextResponse.json(
      { error: "Demo request storage is not configured yet." },
      { status: 503 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { name, company, workEmail, phone, companySize, country, message } =
    parsed.data;

  const { error } = await supabase.from("demo_requests").insert({
    name,
    company,
    work_email: workEmail,
    phone,
    company_size: companySize,
    country,
    message: message ?? null,
  });

  if (error) {
    console.error("Failed to store demo request:", error.message);
    return NextResponse.json(
      { error: "Could not save your request. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
