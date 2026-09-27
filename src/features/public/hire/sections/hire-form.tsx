"use client";

import { useActionState, useState, type ReactNode } from "react";
import { FiAlertCircle, FiChevronDown, FiLock } from "react-icons/fi";
import { cn } from "@/lib/utils";
import type { CampaignDuration, HireFormField, HireFormState } from "@/types/hire-request";
import { submitHireRequest } from "../actions";
import { PROMOTION_MAX } from "../hire-form-rules";
import { HireSuccess } from "./hire-success";

interface HireFormProps {
  username: string;
  firstName: string;
  paymentMethods: string[];
  durations: CampaignDuration[];
  defaultDuration: string;
  minimumBooking: string;
  // Server-rendered influencer summary shown at the top of the card.
  header: ReactNode;
}

const inputClass =
  "w-full rounded-md border bg-surface px-4 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20";

function fieldClass(hasError: boolean) {
  return cn(inputClass, hasError ? "border-danger focus:border-danger" : "border-border focus:border-primary");
}

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
      {optional && (
        <span className="rounded-full bg-border-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
          Optional
        </span>
      )}
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

export function HireForm({
  username,
  firstName,
  paymentMethods,
  durations,
  defaultDuration,
  minimumBooking,
  header,
}: HireFormProps) {
  const initialState: HireFormState = {
    status: "idle",
    values: {
      fullName: "",
      location: "",
      socialHandle: "",
      promotion: "",
      paymentMethod: paymentMethods[0] ?? "",
      duration: defaultDuration,
    },
  };
  const [state, formAction, pending] = useActionState(submitHireRequest.bind(null, username), initialState);
  const [promotionLength, setPromotionLength] = useState(0);

  const { values } = state;
  const errors = state.status === "error" ? state.errors : {};
  // aria wiring for a field: marks it invalid and links it to its error text.
  const describe = (field: HireFormField) =>
    errors[field] ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {};

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      {header}
      <hr className="my-6 border-border" />

      {state.status === "success" ? (
        <HireSuccess
          username={username}
          firstName={firstName}
          request={state.request}
          durationLabel={durations.find((duration) => duration.value === state.request.duration)?.label ?? ""}
        />
      ) : (
        <form action={formAction} noValidate className="space-y-6">
          {state.status === "error" && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg bg-danger-light px-4 py-3 text-sm text-danger">
              <FiAlertCircle className="mt-0.5 shrink-0" />
              {state.message}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="fullName" required>
                Your Full Name
              </Label>
              <input
                id="fullName"
                name="fullName"
                autoComplete="name"
                required
                maxLength={80}
                defaultValue={values.fullName}
                placeholder="e.g. Jane Doe"
                className={cn(fieldClass(!!errors.fullName), "h-11")}
                {...describe("fullName")}
              />
              <FieldError id="fullName-error" message={errors.fullName} />
            </div>
            <div>
              <Label htmlFor="location" required>
                Location
              </Label>
              <input
                id="location"
                name="location"
                autoComplete="address-level2"
                required
                maxLength={80}
                defaultValue={values.location}
                placeholder="City, Country"
                className={cn(fieldClass(!!errors.location), "h-11")}
                {...describe("location")}
              />
              <FieldError id="location-error" message={errors.location} />
            </div>
          </div>

          <fieldset className="space-y-5 rounded-xl border border-dashed border-border bg-surface-alt p-5">
            <legend className="sr-only">Additional details (optional)</legend>
            <div className="flex flex-wrap items-center gap-2.5" aria-hidden>
              <span className="text-sm font-semibold text-heading">Additional Details</span>
              <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                Optional · Can be skipped
              </span>
            </div>

            <div>
              <Label htmlFor="socialHandle" optional>
                Your Social Media Handle
              </Label>
              <input
                id="socialHandle"
                name="socialHandle"
                maxLength={31}
                defaultValue={values.socialHandle}
                placeholder="@yourbrand"
                className={cn(fieldClass(!!errors.socialHandle), "h-11")}
                {...describe("socialHandle")}
              />
              <FieldError id="socialHandle-error" message={errors.socialHandle} />
            </div>

            <div>
              <Label htmlFor="promotion" optional>
                What do you want to promote?
              </Label>
              <textarea
                id="promotion"
                name="promotion"
                rows={4}
                maxLength={PROMOTION_MAX}
                defaultValue={values.promotion}
                onChange={(event) => setPromotionLength(event.target.value.length)}
                placeholder="Describe your product, service, or brand..."
                className={cn(fieldClass(!!errors.promotion), "resize-y py-3")}
                {...describe("promotion")}
              />
              <div className="mt-1.5 flex items-start justify-between gap-3">
                <FieldError id="promotion-error" message={errors.promotion} />
                <span className="ml-auto text-xs text-muted" aria-live="polite">
                  {promotionLength}/{PROMOTION_MAX}
                </span>
              </div>
            </div>
          </fieldset>

          <fieldset {...(errors.paymentMethod ? { "aria-describedby": "paymentMethod-error" } : {})}>
            <legend className="mb-2 text-sm font-semibold text-heading">Preferred Payment Method</legend>
            <div className="flex flex-wrap gap-3">
              {paymentMethods.map((method) => (
                <label
                  key={method}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-heading transition-colors hover:border-primary-border has-checked:border-primary has-checked:bg-primary-light has-focus-visible:ring-2 has-focus-visible:ring-primary/30"
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method}
                    defaultChecked={values.paymentMethod === method}
                    className="h-4 w-4 accent-primary"
                  />
                  {method}
                </label>
              ))}
            </div>
            <FieldError id="paymentMethod-error" message={errors.paymentMethod} />
          </fieldset>

          <div>
            <Label htmlFor="duration">Campaign Duration</Label>
            <div className="relative">
              <select
                id="duration"
                name="duration"
                defaultValue={values.duration}
                className={cn(fieldClass(!!errors.duration), "h-11 appearance-none pr-10")}
                aria-describedby={errors.duration ? "duration-error" : "duration-hint"}
                aria-invalid={errors.duration ? true : undefined}
              >
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
                {firstName}&apos;s minimum booking is {minimumBooking}.
              </p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={pending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70"
            >
              {pending && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
              )}
              {pending ? "Sending request..." : "Submit Hire Request"}
            </button>
            <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-xs text-muted">
              <FiLock className="mt-0.5 shrink-0" />
              No payment is taken now. {firstName} reviews your request first, and payment is held in escrow until the
              content is delivered.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
