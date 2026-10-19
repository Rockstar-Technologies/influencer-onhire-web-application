"use client";

import { useActionState, useEffect, useRef } from "react";
import { FiArrowUpRight, FiX } from "react-icons/fi";
import { FieldError, fieldClass, FormLabel } from "@/components/shared/form-field";
import { PAYMENT_METHOD_LABELS } from "@/lib/domain/labels";
import { PAYMENT_METHOD } from "@/lib/domain/vocabulary";
import { cn, formatPrice } from "@/lib/utils";
import type { WithdrawField, WithdrawFormState } from "@/types/payments";
import { withdrawAction } from "../actions";

const INITIAL_STATE: WithdrawFormState = { status: "idle" };
const prefix = "withdraw";

// `minimum` comes from the server so this client bundle never pulls in the payments service.
export function WithdrawDialog({ available, minimum }: { available: number; minimum: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(withdrawAction, INITIAL_STATE);

  // Close once the withdrawal is recorded; the page revalidates and it shows as "Processing".
  useEffect(() => {
    if (state.status === "success") dialogRef.current?.close();
  }, [state]);

  const errors = state.status === "error" ? state.errors : {};
  const values = state.status === "error" ? state.values : undefined;
  const describe = (field: WithdrawField) => (errors[field] ? { "aria-invalid": true, "aria-describedby": `${prefix}-${field}-error` } : {});
  const canWithdraw = available >= minimum;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        disabled={!canWithdraw}
        className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-navy-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FiArrowUpRight aria-hidden />
        Withdraw
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${prefix}-title`}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current.close();
        }}
        className="m-auto w-[min(30rem,calc(100vw-2rem))] whitespace-normal rounded-2xl border border-border bg-surface p-0 text-left text-body shadow-xl backdrop:bg-heading/40"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 id={`${prefix}-title`} className="font-display text-lg font-bold text-heading">
              Withdraw to mobile money
            </h2>
            <p className="text-sm text-muted">Available: {formatPrice(available)}</p>
          </div>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close" className="rounded-md p-1.5 text-muted hover:bg-surface-alt hover:text-heading">
            <FiX />
          </button>
        </div>

        <form action={formAction} noValidate className="space-y-5 px-6 py-5">
          <div>
            <div className="flex items-end justify-between gap-3">
              <FormLabel htmlFor={`${prefix}-amount`} required>
                Amount (CFA)
              </FormLabel>
              <button
                type="button"
                onClick={() => {
                  if (amountRef.current) amountRef.current.value = String(available);
                }}
                className="mb-1.5 text-xs font-semibold text-navy hover:underline"
              >
                Withdraw all
              </button>
            </div>
            <input
              ref={amountRef}
              id={`${prefix}-amount`}
              name="amount"
              inputMode="numeric"
              defaultValue={values?.amount}
              placeholder={`${minimum.toLocaleString("en-US")} to ${available.toLocaleString("en-US")}`}
              className={cn(fieldClass(!!errors.amount), "h-11 tabular-nums")}
              {...describe("amount")}
            />
            <FieldError id={`${prefix}-amount-error`} message={errors.amount} />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-heading">Send to</legend>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHOD.values.map((method) => (
                <label
                  key={method}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3.5 py-2.5 text-sm font-medium text-heading has-checked:border-navy has-checked:bg-info-light has-focus-visible:ring-2 has-focus-visible:ring-navy/20"
                >
                  <input type="radio" name="method" value={method} defaultChecked={(values?.method ?? "mtn_momo") === method} className="accent-navy" />
                  {PAYMENT_METHOD_LABELS[method]}
                </label>
              ))}
            </div>
            <FieldError id={`${prefix}-method-error`} message={errors.method} />
          </fieldset>

          <div>
            <FormLabel htmlFor={`${prefix}-phone`} required>
              Mobile money number
            </FormLabel>
            <input
              id={`${prefix}-phone`}
              name="phone"
              inputMode="tel"
              defaultValue={values?.phone}
              placeholder="6XX XXX XXX"
              className={cn(fieldClass(!!errors.phone), "h-11 tabular-nums")}
              {...describe("phone")}
            />
            <FieldError id={`${prefix}-phone-error`} message={errors.phone} />
          </div>

          <p className="text-xs text-muted">Withdrawal requests are subject to review. Any applicable fees and estimated processing times will be shown when confirmed.</p>

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
              {pending ? "Sending..." : "Withdraw"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
