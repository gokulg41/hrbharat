"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";

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
  // Honeypot — kept empty and hidden from real users via CSS below.
  companyWebsite: z.string().max(0, "").optional(),
});

type FormValues = z.infer<typeof schema>;

const inputClass =
  "w-full rounded-lg border border-[#E0E3E8] bg-white px-4 py-3 text-[14px] text-[#10131A] placeholder:text-[#9AA1AC] focus:outline-none focus:border-[#0E7C66] focus:ring-1 focus:ring-[#0E7C66] transition-colors";

export default function DemoForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setStatus("submitting");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setErrorMessage(
          json?.error ?? "Something went wrong. Please try again."
        );
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setErrorMessage(
        "We couldn't reach the server. Check your connection and try again."
      );
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-[#E6E8EC] bg-white p-10 text-center">
        <div className="w-12 h-12 rounded-full bg-[#E9F5F2] flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={22} className="text-[#0E7C66]" />
        </div>
        <h3 className="text-[20px] font-semibold text-[#10131A]">
          Request received
        </h3>
        <p className="mt-2.5 text-[14px] text-[#5B6472] max-w-sm mx-auto">
          Thanks — our team will reach out shortly to schedule your HRBharat
          walkthrough.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-2xl border border-[#E6E8EC] bg-white p-8 space-y-5"
      noValidate
    >
      {/* Honeypot: never shown to real users. `inert` makes it fully
          unreachable by keyboard, screen readers, and browser
          autofill — not just visually hidden — which avoids it
          stealing focus from the real fields. Bots that auto-fill
          every field will fill this and get silently rejected
          server-side. */}
      <div
        inert
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          left: -9999,
          top: -9999,
        }}
      >
        <label htmlFor="companyWebsite">Leave this field empty</label>
        <input
          id="companyWebsite"
          tabIndex={-1}
          autoComplete="off"
          {...register("companyWebsite")}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-[13px] font-medium text-[#2D3440] mb-1.5">
            Full name
          </label>
          <input className={inputClass} placeholder="Jane Doe" {...register("name")} />
          {errors.name && (
            <p className="mt-1 text-[12px] text-red-600">{errors.name.message}</p>
          )}
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#2D3440] mb-1.5">
            Company
          </label>
          <input className={inputClass} placeholder="Acme Pvt Ltd" {...register("company")} />
          {errors.company && (
            <p className="mt-1 text-[12px] text-red-600">{errors.company.message}</p>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-[13px] font-medium text-[#2D3440] mb-1.5">
            Work email
          </label>
          <input
            type="email"
            className={inputClass}
            placeholder="jane@company.com"
            {...register("workEmail")}
          />
          {errors.workEmail && (
            <p className="mt-1 text-[12px] text-red-600">
              {errors.workEmail.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#2D3440] mb-1.5">
            Phone
          </label>
          <input className={inputClass} placeholder="+91 98765 43210" {...register("phone")} />
          {errors.phone && (
            <p className="mt-1 text-[12px] text-red-600">{errors.phone.message}</p>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-[13px] font-medium text-[#2D3440] mb-1.5">
            Company size
          </label>
          <select className={inputClass} defaultValue="" {...register("companySize")}>
            <option value="" disabled>
              Select
            </option>
            <option value="1-10">1–10 employees</option>
            <option value="11-50">11–50 employees</option>
            <option value="51-200">51–200 employees</option>
            <option value="200+">200+ employees</option>
          </select>
          {errors.companySize && (
            <p className="mt-1 text-[12px] text-red-600">
              {errors.companySize.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#2D3440] mb-1.5">
            Country
          </label>
          <select className={inputClass} defaultValue="" {...register("country")}>
            <option value="" disabled>
              Select
            </option>
            <option value="India">India</option>
            <option value="UAE">UAE</option>
            <option value="Other">Other</option>
          </select>
          {errors.country && (
            <p className="mt-1 text-[12px] text-red-600">{errors.country.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-[13px] font-medium text-[#2D3440] mb-1.5">
          Message <span className="text-[#9AA1AC] font-normal">(optional)</span>
        </label>
        <textarea
          className={inputClass}
          rows={4}
          placeholder="Tell us a bit about your team and what you're looking for."
          {...register("message")}
        />
      </div>

      {status === "error" && errorMessage && (
        <p className="text-[13px] text-red-600">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full inline-flex items-center justify-center gap-2 bg-[#0B1220] text-white font-semibold text-[15px] px-6 py-3.5 rounded-lg hover:bg-[#142238] transition-colors disabled:opacity-60"
      >
        {status === "submitting" && <Loader2 size={16} className="animate-spin" />}
        {status === "submitting" ? "Sending..." : "Book a Demo"}
      </button>
    </form>
  );
}