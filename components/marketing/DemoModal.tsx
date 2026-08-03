"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, CheckCircle2 } from "lucide-react";

const demoRequestSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  company: z.string().min(2, "Enter your company name"),
  workEmail: z.string().email("Enter a valid work email"),
  phone: z.string().min(7, "Enter a valid phone number"),
  companySize: z.string().min(1, "Select a company size"),
  country: z.string().min(1, "Select a country"),
  message: z.string().optional(),
});

type DemoRequestValues = z.infer<typeof demoRequestSchema>;

export default function DemoModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<DemoRequestValues>({
    resolver: zodResolver(demoRequestSchema),
  });

  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => reset(), 300);
      return () => clearTimeout(t);
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, reset]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!isOpen) return null;

  // TODO(backend): wire this to a real endpoint, e.g. POST /api/demo-requests
  // which should insert into a `demo_requests` table and notify sales.
  // Currently this only simulates a submission client-side.
  async function onSubmit(_values: DemoRequestValues) {
    await new Promise((r) => setTimeout(r, 700));
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-modal-title"
    >
      <div
        className="absolute inset-0 bg-[var(--mkt-navy-deep)]/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="mkt relative w-full max-w-lg mkt-card rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <p className="mkt-eyebrow">Book a demo</p>
            <h2
              id="demo-modal-title"
              className="text-xl font-bold tracking-tight text-[var(--mkt-navy)] mt-1"
            >
              See HRBharat in action
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[var(--mkt-muted)] hover:text-[var(--mkt-navy)] p-1 -mr-1 -mt-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitSuccessful ? (
          <div className="px-6 py-10 flex flex-col items-center text-center">
            <CheckCircle2 className="w-12 h-12 text-[var(--mkt-teal)] mb-4" />
            <h3 className="text-lg font-semibold text-[var(--mkt-navy)]">
              Request received
            </h3>
            <p className="text-sm text-[var(--mkt-muted)] mt-2 max-w-sm">
              A member of our team will reach out within one business day to
              schedule your walkthrough of HRBharat.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 text-sm font-semibold text-[var(--mkt-teal)] hover:underline"
            >
              Close
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="px-6 py-6 space-y-4"
            noValidate
          >
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full name" error={errors.name?.message}>
                <input
                  {...register("name")}
                  className={inputClasses}
                  placeholder="Priya Sharma"
                />
              </Field>
              <Field label="Company" error={errors.company?.message}>
                <input
                  {...register("company")}
                  className={inputClasses}
                  placeholder="Acme Manufacturing"
                />
              </Field>
            </div>

            <Field label="Work email" error={errors.workEmail?.message}>
              <input
                {...register("workEmail")}
                type="email"
                className={inputClasses}
                placeholder="priya@acme.com"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone" error={errors.phone?.message}>
                <input
                  {...register("phone")}
                  type="tel"
                  className={inputClasses}
                  placeholder="+91 98765 43210"
                />
              </Field>
              <Field label="Country" error={errors.country?.message}>
                <select {...register("country")} className={inputClasses}>
                  <option value="">Select</option>
                  <option value="india">India</option>
                  <option value="uae">UAE</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>

            <Field label="Company size" error={errors.companySize?.message}>
              <select {...register("companySize")} className={inputClasses}>
                <option value="">Select</option>
                <option value="1-10">1–10 employees</option>
                <option value="11-50">11–50 employees</option>
                <option value="51-200">51–200 employees</option>
                <option value="200+">200+ employees</option>
              </select>
            </Field>

            <Field label="Message (optional)" error={errors.message?.message}>
              <textarea
                {...register("message")}
                rows={3}
                className={`${inputClasses} resize-none`}
                placeholder="Tell us a bit about your team and what you're looking for"
              />
            </Field>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-[var(--mkt-navy)] text-white font-semibold rounded-lg py-3 text-sm hover:bg-[var(--mkt-navy-soft)] transition-colors disabled:opacity-60"
            >
              {isSubmitting ? "Sending…" : "Request demo"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const inputClasses =
  "w-full rounded-lg border border-[var(--mkt-border-strong)] px-3 py-2.5 text-sm bg-white text-[var(--mkt-text)] transition-colors focus:outline-none focus:border-[var(--mkt-teal)]";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[var(--mkt-muted)] mb-1.5">
        {label}
      </span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}
