"use client";

import { useActionState, useEffect, useRef } from "react";
import { FiCheckCircle, FiChevronDown, FiLock, FiPlus, FiX } from "react-icons/fi";
import { FieldError, fieldClass, FormLabel } from "@/components/shared/form-field";
import { cn, formatPrice } from "@/lib/utils";
import type { FundField, FundFormState } from "@/types/payments";
import { fundCampaignAction } from "../actions";

const INITIAL_STATE: FundFormState = { status: "idle" };

export function FundCampaignDialog({ creators }: { creators: { id: string; name: string; niche: string }[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(fundCampaignAction, INITIAL_STATE);

  // Close once the payment is on hold; the page revalidates and the table shows it.
  useEffect(() => {
    if (state.status === "success") dialogRef.current?.close();
  }, [state]);

  const errors = state.status === "error" ? state.errors : {};
  const values = state.status === "error" ? state.values : undefined;
  const describe = (field: FundField) => (errors[field] ? { "aria-invalid": true, "aria-describedby": `fund-${field}-error` } : {});

  return (
    <>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-hover"
        >
          <FiPlus aria-hidden />
          Pay for a campaign
        </button>
        <p aria-live="polite" className="text-xs font-medium text-success-strong">
          {state.status === "success" && (
            <span className="inline-flex items-center gap-1.5">
              <FiCheckCircle aria-hidden />
              {formatPrice(state.amount)} is on hold for {state.creatorName} ({state.invoice})
            </span>
          )}
        </p>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="fund-title"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current.close();
        }}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-0 text-body shadow-xl backdrop:bg-heading/40"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="fund-title" className="font-display text-lg font-bold text-heading">
            Pay for a campaign
          </h2>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close" className="rounded-md p-1.5 text-muted hover:bg-surface-alt hover:text-heading">
            <FiX />
          </button>
        </div>

        {/* The key clears the inputs after each successful payment. */}
        <form key={state.status === "success" ? state.invoice : "form"} action={formAction} noValidate className="space-y-5 px-6 py-5">
          <p className="flex gap-2 rounded-lg bg-info-light px-3 py-2.5 text-sm text-navy">
            <FiLock className="mt-0.5 shrink-0" aria-hidden />
            Your payment is held safely in escrow. The creator can see it&apos;s on hold, and it&apos;s only released after they deliver.
          </p>

          <div>
            <FormLabel htmlFor="fund-creatorId" required>
              Creator
            </FormLabel>
            <div className="relative">
              <select
                id="fund-creatorId"
                name="creatorId"
                defaultValue={values?.creatorId ?? ""}
                className={cn(fieldClass(!!errors.creatorId), "h-11 appearance-none pr-9")}
                {...describe("creatorId")}
              >
                <option value="" disabled>
                  Choose a creator
                </option>
                {creators.map((creator) => (
                  <option key={creator.id} value={creator.id}>
                    {creator.name} · {creator.niche}
                  </option>
                ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            </div>
            <FieldError id="fund-creatorId-error" message={errors.creatorId} />
          </div>

          <div>
            <FormLabel htmlFor="fund-campaign" required>
              Campaign
            </FormLabel>
            <input
              id="fund-campaign"
              name="campaign"
              maxLength={80}
              defaultValue={values?.campaign}
              placeholder="e.g. Autumn Glow Launch"
              className={cn(fieldClass(!!errors.campaign), "h-11")}
              {...describe("campaign")}
            />
            <FieldError id="fund-campaign-error" message={errors.campaign} />
          </div>

          <div>
            <FormLabel htmlFor="fund-amount" required>
              Amount to deposit (CFA)
            </FormLabel>
            <input
              id="fund-amount"
              name="amount"
              inputMode="numeric"
              defaultValue={values?.amount}
              placeholder="e.g. 500,000"
              className={cn(fieldClass(!!errors.amount), "h-11 tabular-nums")}
              {...describe("amount")}
            />
            <FieldError id="fund-amount-error" message={errors.amount} />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-heading">Pay with</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["MTN MoMo", "Orange Money"] as const).map((method) => (
                <label
                  key={method}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3.5 py-2.5 text-sm font-medium text-heading has-checked:border-navy has-checked:bg-info-light has-focus-visible:ring-2 has-focus-visible:ring-navy/20"
                >
                  <input type="radio" name="method" value={method} defaultChecked={(values?.method ?? "MTN MoMo") === method} className="accent-navy" />
                  {method}
                </label>
              ))}
            </div>
            <FieldError id="fund-method-error" message={errors.method} />
          </fieldset>

          <div>
            <FormLabel htmlFor="fund-phone" required>
              Mobile money number
            </FormLabel>
            <input
              id="fund-phone"
              name="phone"
              inputMode="tel"
              defaultValue={values?.phone}
              placeholder="6XX XXX XXX"
              className={cn(fieldClass(!!errors.phone), "h-11 tabular-nums")}
              {...describe("phone")}
            />
            <FieldError id="fund-phone-error" message={errors.phone} />
            <p className="mt-1.5 text-xs text-muted">You&apos;ll get a prompt on this phone to approve the payment.</p>
          </div>

          {state.status === "error" && state.message && (
            <p role="alert" className="rounded-lg bg-danger-light px-3 py-2 text-sm font-medium text-danger-strong">
              {state.message}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <button type="button" onClick={() => dialogRef.current?.close()} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-heading hover:bg-surface-alt">
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-hover disabled:cursor-wait disabled:opacity-70"
            >
              {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
              {pending ? "Paying..." : "Pay into escrow"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
