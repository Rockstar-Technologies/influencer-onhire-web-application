"use client";

import { useActionState, useEffect, useRef } from "react";
import { FiAlertCircle, FiSend, FiX } from "react-icons/fi";
import { FieldError, fieldClass, FormLabel } from "@/components/shared/form-field";
import { cn, formatPrice } from "@/lib/utils";
import type { CashoutField, CashoutFormState, CreatorPaymentView } from "@/types/payments";
import { requestCashoutAction } from "../actions";

const INITIAL_STATE: CashoutFormState = { status: "idle" };

export function CashoutDialog({ payment }: { payment: CreatorPaymentView }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(requestCashoutAction, INITIAL_STATE);

  // Close once the request is in; the page revalidates and the row switches to "Payout requested".
  useEffect(() => {
    if (state.status === "success") dialogRef.current?.close();
  }, [state]);

  const errors = state.status === "error" ? state.errors : {};
  const values = state.status === "error" ? state.values : undefined;
  const prefix = `cashout-${payment.id}`;
  const describe = (field: CashoutField) => (errors[field] ? { "aria-invalid": true, "aria-describedby": `${prefix}-${field}-error` } : {});

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-navy-hover"
      >
        <FiSend aria-hidden />
        Submit report &amp; cash out
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${prefix}-title`}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current.close();
        }}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] whitespace-normal rounded-2xl border border-border bg-surface p-0 text-left text-body shadow-xl backdrop:bg-heading/40"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 id={`${prefix}-title`} className="font-display text-lg font-bold text-heading">
              Submit report &amp; cash out
            </h2>
            <p className="text-sm text-muted">
              {payment.campaign} · {payment.brandName}
            </p>
          </div>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close" className="rounded-md p-1.5 text-muted hover:bg-surface-alt hover:text-heading">
            <FiX />
          </button>
        </div>

        <form action={formAction} noValidate className="space-y-5 px-6 py-5">
          <input type="hidden" name="paymentId" value={payment.id} />

          <dl className="space-y-1.5 rounded-xl bg-surface-alt px-4 py-3 text-sm tabular-nums">
            <div className="flex justify-between gap-4">
              <dt className="text-body">Campaign budget</dt>
              <dd className="text-heading">{formatPrice(payment.split.gross)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-danger-strong">
              <dt>Platform service fee (20%)</dt>
              <dd>−{formatPrice(payment.split.fee)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-dashed border-border pt-1.5 font-semibold text-heading">
              <dt>Added to your balance</dt>
              <dd>{formatPrice(payment.split.net)}</dd>
            </div>
          </dl>

          {state.status === "error" && state.message && (
            <p role="alert" className="flex items-center gap-2 rounded-lg bg-danger-light px-3 py-2 text-sm font-medium text-danger-strong">
              <FiAlertCircle className="shrink-0" aria-hidden />
              {state.message}
            </p>
          )}

          <div>
            <FormLabel htmlFor={`${prefix}-summary`} required>
              What did you deliver?
            </FormLabel>
            <textarea
              id={`${prefix}-summary`}
              name="summary"
              rows={4}
              maxLength={1500}
              defaultValue={values?.summary}
              placeholder="e.g. Posted 2 reels and 4 stories featuring the product. 180K views, 8% engagement."
              className={cn(fieldClass(!!errors.summary), "resize-y py-3")}
              {...describe("summary")}
            />
            <FieldError id={`${prefix}-summary-error`} message={errors.summary} />
          </div>

          <div>
            <FormLabel htmlFor={`${prefix}-links`} required>
              Links to your posts
            </FormLabel>
            <textarea
              id={`${prefix}-links`}
              name="links"
              rows={3}
              defaultValue={values?.links}
              placeholder={"https://instagram.com/reel/...\nhttps://tiktok.com/@you/video/..."}
              className={cn(fieldClass(!!errors.links), "resize-y py-3 font-mono text-xs")}
              {...describe("links")}
            />
            {errors.links ? (
              <FieldError id={`${prefix}-links-error`} message={errors.links} />
            ) : (
              <p className="mt-1.5 text-xs text-muted">One link per line, up to 5. The brand can open these to check your work.</p>
            )}
          </div>

          <p className="text-xs text-muted">
            Once the platform confirms your delivery, {formatPrice(payment.split.net)} is added to your balance. You can then withdraw it to MTN MoMo or
            Orange Money.
          </p>

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
              {pending ? "Submitting..." : `Request ${formatPrice(payment.split.net)}`}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
