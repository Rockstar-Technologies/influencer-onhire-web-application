"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { cn } from "@/lib/utils";
import {
  PAYMENT_METHOD_LABELS,
  formatCameroonPhone,
  formatFcfa,
  formatNumber,
  isCameroonMobile,
  parseAmount,
} from "@/lib/format";
import { withdrawFunds } from "@/services/earnings.service";
import type { Withdrawal } from "@/types/earnings";
import type { PaymentMethod } from "@/types/payment";

type Errors = Partial<Record<"amount" | "phone", string>>;

const inputClass = (hasError: boolean) =>
  cn(
    "h-10 w-full rounded-lg border bg-surface px-3 text-sm text-heading outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15",
    hasError ? "border-danger" : "border-border"
  );

export function WithdrawPanel({
  availableBalance,
  minimum,
  onWithdrawn,
}: {
  availableBalance: number;
  minimum: number;
  onWithdrawn: (withdrawal: Withdrawal) => void;
}) {
  const [amount, setAmount] = useState(availableBalance > 0 ? formatNumber(availableBalance) : "");
  const [method, setMethod] = useState<PaymentMethod>("mtn_momo");
  const [phone, setPhone] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validate(): Errors {
    const errors: Errors = {};
    const value = parseAmount(amount);
    if (!amount.trim()) errors.amount = "Enter how much to withdraw.";
    else if (!Number.isFinite(value) || value < minimum) errors.amount = `The minimum withdrawal is ${formatFcfa(minimum)}.`;
    else if (value > availableBalance) errors.amount = `You can withdraw up to ${formatFcfa(availableBalance)}.`;
    if (!isCameroonMobile(phone)) errors.phone = "Use a 9-digit Cameroon number starting with 6, e.g. 677 123 456.";
    return errors;
  }

  const errors = attempted ? validate() : {};
  const empty = availableBalance < minimum;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    if (Object.keys(validate()).length) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const withdrawal = await withdrawFunds({ amount: parseAmount(amount), method, phone: formatCameroonPhone(phone) });
      onWithdrawn(withdrawal);
    } catch {
      setSubmitError("The withdrawal didn't go through. Check the amount and number, then try again.");
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-bold text-heading">Withdraw Funds</h2>
      <div className="mt-3 rounded-xl bg-success/10 px-4 py-3">
        <p className="text-sm text-heading">
          <span className="font-bold tabular-nums">{formatFcfa(availableBalance)}</span> Available Balance
        </p>
        <p className="text-xs text-success">Released &amp; ready to withdraw</p>
      </div>

      {empty ? (
        <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
          Nothing to withdraw yet. Request a payout on a finished campaign — once it&apos;s released, it shows up here.
        </p>
      ) : (
        <form noValidate onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="withdraw-amount" className="text-sm font-semibold text-heading">
              Amount to Withdraw
            </label>
            <input
              id="withdraw-amount"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={Boolean(errors.amount)}
              aria-describedby="withdraw-amount-hint"
              className={inputClass(Boolean(errors.amount))}
            />
            <div id="withdraw-amount-hint" className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => setAmount(formatNumber(availableBalance))}
                className="font-semibold text-primary hover:text-primary-hover"
              >
                Withdraw full balance
              </button>
              {errors.amount && <span className="font-medium text-danger">{errors.amount}</span>}
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-semibold text-heading">Withdraw To</legend>
            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((option) => (
              <label
                key={option}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  method === option ? "border-primary bg-primary-light text-primary" : "border-border text-heading hover:bg-surface-alt"
                )}
              >
                <input
                  type="radio"
                  name="withdraw-method"
                  value={option}
                  checked={method === option}
                  onChange={() => setMethod(option)}
                  className="accent-[var(--color-primary)]"
                />
                {PAYMENT_METHOD_LABELS[option]}
              </label>
            ))}
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="withdraw-phone" className="text-sm font-semibold text-heading">
              Mobile Money Number
            </label>
            <input
              id="withdraw-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="e.g. 6XX XXX XXX"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby="withdraw-phone-error"
              className={inputClass(Boolean(errors.phone))}
            />
            {errors.phone && (
              <p id="withdraw-phone-error" className="text-xs font-medium text-danger">
                {errors.phone}
              </p>
            )}
          </div>

          {submitError && (
            <p className="text-sm font-medium text-danger" role="alert">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting request…" : "Withdraw Funds"}
          </button>
          <p className="text-center text-xs text-muted">
            Withdrawal requests are subject to review. Any applicable fees and estimated processing times will be shown when confirmed.
          </p>
        </form>
      )}
    </section>
  );
}
