"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { FiAlertCircle, FiChevronDown, FiLock } from "react-icons/fi";
import type { HireCreator, OfferView } from "@/lib/api/schemas";
import { formatFcfa } from "@/lib/format";
import { cn } from "@/lib/utils";
import { submitHireAction } from "../actions";
import { durationsAtLeast } from "../durations";
import { offerFailureNotice } from "../failure";
import type { FailureNotice } from "../failure";
import { PROMOTION_MAX, initialHireValues, validateHireForm } from "../mapping";
import type { HireField, HireFormErrors, HireFormValues } from "../mapping";
import { HireSuccess } from "./hire-success";

const inputClass = "w-full rounded-md border bg-surface px-4 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20";
const fieldClass = (hasError: boolean) => cn(inputClass, hasError ? "border-danger focus:border-danger" : "border-border focus:border-primary");

function Label({ htmlFor, children, required, optional }: { htmlFor?: string; children: ReactNode; required?: boolean; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 flex items-center gap-2 text-sm font-semibold text-heading">
      <span>
        {children}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
      </span>
      {optional && <span className="rounded-full bg-border-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">Optional</span>}
    </label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger">
      <FiAlertCircle className="shrink-0" />
      {message}
    </p>
  );
}

interface HireFormProps {
  creator: HireCreator;
  firstName: string;
  /** Server-rendered creator summary shown at the top of the card. */
  header: ReactNode;
}

export function HireForm({ creator, firstName, header }: HireFormProps) {
  const [values, setValues] = useState<HireFormValues>(() => initialHireValues(creator));
  const [errors, setErrors] = useState<HireFormErrors>({});
  const [notice, setNotice] = useState<FailureNotice | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<OfferView | null>(null);
  const inFlight = useRef(false);
  const returnTo = `/influencers/${encodeURIComponent(creator.username)}/hire`;

  const durations = durationsAtLeast(creator.minimumBooking.days);
  const platform = creator.platforms.find((p) => p.platform === values.platform);
  const set = (field: HireField, value: string) => setValues((current) => ({ ...current, [field]: value }));
  const describe = (field: HireField) => (errors[field] ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {});

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return; // a second submit in the same instant must not send a second request
    const problems = validateHireForm(values, creator);
    setNotice(null);
    setErrors(problems);
    if (Object.keys(problems).length > 0) {
      setNotice({ text: "Please fix the highlighted fields and try again. Nothing was sent." });
      return;
    }
    inFlight.current = true;
    setSending(true);
    try {
      const result = await submitHireAction({ username: creator.username, values });
      if (result.ok) {
        setSent(result.offer);
        return;
      }
      if (result.error.kind === "validation") setErrors(result.error.fields);
      setNotice(offerFailureNotice(result.error, returnTo, { href: "/influencers", label: "Back to influencers" }));
    } catch {
      setNotice(offerFailureNotice({ kind: "unavailable", requestId: null }, returnTo, { href: "/influencers", label: "Back to influencers" }));
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      {header}
      <hr className="my-6 border-border" />

      {sent ? (
        <HireSuccess firstName={firstName} offer={sent} />
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          {notice && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg bg-danger-light px-4 py-3 text-sm text-danger">
              <FiAlertCircle className="mt-0.5 shrink-0" />
              <p>
                {notice.text}
                {notice.link && (
                  <>
                    {" "}
                    <Link href={notice.link.href} className="font-semibold underline">
                      {notice.link.label}
                    </Link>
                  </>
                )}
              </p>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="fullName" required>
                Your Full Name
              </Label>
              <input id="fullName" autoComplete="name" required maxLength={80} value={values.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="e.g. Jane Doe" className={cn(fieldClass(!!errors.fullName), "h-11")} {...describe("fullName")} />
              <FieldError id="fullName-error" message={errors.fullName} />
            </div>
            <div>
              <Label htmlFor="location" required>
                Location
              </Label>
              <input id="location" autoComplete="address-level2" required maxLength={80} value={values.location} onChange={(e) => set("location", e.target.value)} placeholder="City, Country" className={cn(fieldClass(!!errors.location), "h-11")} {...describe("location")} />
              <FieldError id="location-error" message={errors.location} />
            </div>
          </div>

          <div>
            <Label htmlFor="platform" required>
              Platform
            </Label>
            <div className="relative">
              <select id="platform" value={values.platform} onChange={(e) => set("platform", e.target.value)} className={cn(fieldClass(!!errors.platform), "h-11 appearance-none pr-10")} {...describe("platform")}>
                {creator.platforms.map((option) => (
                  <option key={option.platform} value={option.platform}>
                    {option.name} · {formatFcfa(option.priceXaf)}
                  </option>
                ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
            </div>
            <FieldError id="platform-error" message={errors.platform} />
            {platform && (
              <p className="mt-1.5 text-xs text-muted">
                Price: <span className="font-semibold text-heading">{formatFcfa(platform.priceXaf)}</span>, {firstName}&apos;s current rate on {platform.name}. It is fixed when you send the request.
              </p>
            )}
          </div>

          <fieldset className="space-y-5 rounded-xl border border-dashed border-border bg-surface-alt p-5">
            <legend className="sr-only">Additional details (optional)</legend>
            <div className="flex flex-wrap items-center gap-2.5" aria-hidden>
              <span className="text-sm font-semibold text-heading">Additional Details</span>
              <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">Optional · Can be skipped</span>
            </div>
            <div>
              <Label htmlFor="socialHandle" optional>
                Your Social Media Handle
              </Label>
              <input id="socialHandle" maxLength={31} value={values.socialHandle} onChange={(e) => set("socialHandle", e.target.value)} placeholder="@yourbrand" className={cn(fieldClass(!!errors.socialHandle), "h-11")} {...describe("socialHandle")} />
              <FieldError id="socialHandle-error" message={errors.socialHandle} />
            </div>
            <div>
              <Label htmlFor="promotion" optional>
                What do you want to promote?
              </Label>
              <textarea id="promotion" rows={4} maxLength={PROMOTION_MAX} value={values.promotion} onChange={(e) => set("promotion", e.target.value)} placeholder="Describe your product, service, or brand..." className={cn(fieldClass(!!errors.promotion), "resize-y py-3")} {...describe("promotion")} />
              <div className="mt-1.5 flex items-start justify-between gap-3">
                <FieldError id="promotion-error" message={errors.promotion} />
                <span className="ml-auto text-xs text-muted" aria-live="polite">
                  {values.promotion.length}/{PROMOTION_MAX}
                </span>
              </div>
            </div>
          </fieldset>

          <fieldset {...(errors.paymentMethod ? { "aria-describedby": "paymentMethod-error" } : {})}>
            <legend className="mb-2 text-sm font-semibold text-heading">Preferred Payment Method</legend>
            <div className="flex flex-wrap gap-3">
              {creator.acceptedPaymentMethods.map((method) => (
                <label key={method.code} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-heading transition-colors hover:border-primary-border has-checked:border-primary has-checked:bg-primary-light has-focus-visible:ring-2 has-focus-visible:ring-primary/30">
                  <input type="radio" name="paymentMethod" value={method.code} checked={values.paymentMethod === method.code} onChange={() => set("paymentMethod", method.code)} className="h-4 w-4 accent-primary" />
                  {method.name}
                </label>
              ))}
            </div>
            <FieldError id="paymentMethod-error" message={errors.paymentMethod} />
          </fieldset>

          <div>
            <Label htmlFor="duration">Campaign Duration</Label>
            <div className="relative">
              <select id="duration" value={values.duration} onChange={(e) => set("duration", e.target.value)} className={cn(fieldClass(!!errors.duration), "h-11 appearance-none pr-10")} aria-describedby={errors.duration ? "duration-error" : "duration-hint"} aria-invalid={errors.duration ? true : undefined}>
                {durations.map((duration) => (
                  <option key={duration.value} value={duration.value}>
                    {duration.label}
                  </option>
                ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
            </div>
            {errors.duration ? (
              <FieldError id="duration-error" message={errors.duration} />
            ) : (
              <p id="duration-hint" className="mt-1.5 text-xs text-muted">
                {firstName}&apos;s minimum booking is {creator.minimumBooking.label}.
              </p>
            )}
          </div>

          <div>
            <button type="submit" disabled={sending} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70">
              {sending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
              {sending ? "Sending request..." : "Submit Hire Request"}
            </button>
            <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-xs text-muted">
              <FiLock className="mt-0.5 shrink-0" />
              No payment is taken now. {firstName} has 7 days to accept or decline your request.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
