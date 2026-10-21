"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { FiAlertCircle, FiCheckCircle, FiClock, FiLock } from "react-icons/fi";
import type { FundingView } from "@/lib/api/schemas";
import { PAYMENT_METHOD_LABELS } from "@/lib/domain/labels";
import { PAYMENT_METHOD } from "@/lib/domain/vocabulary";
import { formatDate, formatFcfa } from "@/lib/format";
import { cn } from "@/lib/utils";
import { refreshFundingAction, startFundingAction } from "./actions";
import { fundFailureNotice } from "./failure";
import type { FailureNotice } from "./failure";
import { FAILURE_CATEGORY_LABELS, fundingMessage, isUnsettled, newFundingKey, validateFundForm } from "./mapping";
import type { FundErrors } from "./mapping";

const inputClass = "h-11 w-full rounded-md border bg-surface px-4 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20";

const TONE: Record<ReturnType<typeof fundingMessage>["tone"], string> = {
  good: "border-success/30 bg-success-light text-success-strong",
  wait: "border-warning/30 bg-warning-light text-warning",
  bad: "border-danger/30 bg-danger-light text-danger-strong",
  neutral: "border-border bg-surface-alt text-body",
};

interface Props {
  offerId: string;
  initial: FundingView;
  /** The payment method the brand chose when it sent the hire, if any (a convenience default only). */
  preferredMethod: string | null;
}

/**
 * Pays for one accepted booking. The amount shown is the API's own figure (the offer's price) and cannot be edited. Whatever the API says the status is
 * is what is shown: a request that was sent, is pending or is unclear is never presented as paid.
 */
export function FundPanel({ offerId, initial, preferredMethod }: Props) {
  const [funding, setFunding] = useState(initial);
  const [method, setMethod] = useState(PAYMENT_METHOD.is(preferredMethod) ? preferredMethod : "mtn_momo");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<FundErrors>({});
  const [notice, setNotice] = useState<FailureNotice | null>(null);
  const [busy, setBusy] = useState<"pay" | "check" | null>(null);
  const [replayNote, setReplayNote] = useState(false);
  // One key per payment intent: reused when the answer was lost (so a retry can never charge twice), replaced once an attempt has definitively ended.
  const [key, setKey] = useState(() => newFundingKey());
  const inFlight = useRef(false);
  const returnTo = `/brand/offers/${offerId}/fund`;
  const message = fundingMessage(funding);

  async function pay(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return; // a second submit in the same instant must not send a second payment request
    const problems = validateFundForm({ paymentMethod: method, payerPhone: phone });
    setErrors(problems);
    setNotice(null);
    if (Object.keys(problems).length > 0) {
      setNotice({ text: "Please fix the highlighted fields. Nothing was sent and nothing was charged." });
      return;
    }
    inFlight.current = true;
    setBusy("pay");
    try {
      const result = await startFundingAction({ offerId, key, paymentMethod: method, payerPhone: phone });
      if (result.ok) {
        setFunding(result.funding);
        setReplayNote(result.replayed);
        if (result.funding.status === "failed") setKey(newFundingKey()); // the attempt ended: a new attempt is a new intent
        return;
      }
      if (result.error.kind === "validation") setErrors(result.error.fields);
      setNotice(fundFailureNotice(result.error, returnTo));
    } catch {
      setNotice(fundFailureNotice({ kind: "unavailable", requestId: null }, returnTo)); // same key stays: the retry is safe
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  async function check() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy("check");
    setNotice(null);
    try {
      const result = await refreshFundingAction({ offerId });
      if (result.ok) {
        setFunding(result.funding);
        setReplayNote(false);
        if (result.funding.status === "failed") setKey(newFundingKey());
      } else {
        setNotice(fundFailureNotice(result.error, returnTo));
      }
    } catch {
      setNotice(fundFailureNotice({ kind: "unavailable", requestId: null }, returnTo));
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  const Icon = message.tone === "good" ? FiCheckCircle : message.tone === "wait" ? FiClock : message.tone === "bad" ? FiAlertCircle : FiLock;

  return (
    <div className="space-y-6">
      <dl className="grid gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted">Amount to pay</dt>
          <dd data-testid="fund-amount" className="mt-1 text-xl font-bold tabular-nums text-heading">
            {formatFcfa(funding.amountXaf)}
          </dd>
          <dd className="mt-1 text-xs text-muted">The booking&apos;s full price. It is held in escrow.</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Pay by</dt>
          <dd className="mt-1 text-base font-semibold text-heading">{funding.deadline ? formatDate(funding.deadline) : "—"}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Status</dt>
          <dd data-testid="fund-status" className="mt-1 text-base font-semibold text-heading">
            {message.title}
          </dd>
        </div>
      </dl>

      <div role="status" className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", TONE[message.tone])}>
        <Icon className="mt-0.5 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">{message.title}</p>
          <p className="mt-0.5">{message.text}</p>
          {replayNote && <p className="mt-1 text-xs">This request had already been received, so nothing was sent twice.</p>}
        </div>
      </div>

      {funding.simulated && (
        <p data-testid="simulated-note" className="rounded-xl border border-warning/30 bg-warning-light px-4 py-3 text-sm font-medium text-warning">
          Simulated payment: this is a development test. No real money moved and nothing was taken from any phone.
        </p>
      )}

      {notice && (
        <p role="alert" className="rounded-xl bg-danger-light px-4 py-3 text-sm text-danger">
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
      )}

      {funding.canStart && (
        <form onSubmit={pay} noValidate className="space-y-5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="font-display text-base font-bold text-heading">{funding.status === "failed" ? "Try again" : "Pay for this booking"}</h2>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-heading">Pay with</legend>
            <div className="flex flex-wrap gap-3">
              {PAYMENT_METHOD.values.map((code) => (
                <label key={code} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-heading has-checked:border-primary has-checked:bg-primary-light">
                  <input type="radio" name="paymentMethod" value={code} checked={method === code} onChange={() => setMethod(code)} className="h-4 w-4 accent-primary" />
                  {PAYMENT_METHOD_LABELS[code]}
                </label>
              ))}
            </div>
            {errors.paymentMethod && <p className="mt-1.5 text-xs font-medium text-danger">{errors.paymentMethod}</p>}
          </fieldset>
          <div>
            <label htmlFor="payerPhone" className="mb-2 block text-sm font-semibold text-heading">
              The number you&apos;re paying from
            </label>
            <input
              id="payerPhone"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="677 123 456"
              aria-invalid={errors.payerPhone ? true : undefined}
              aria-describedby={errors.payerPhone ? "payerPhone-error" : undefined}
              className={cn(inputClass, errors.payerPhone ? "border-danger" : "border-border focus:border-primary")}
            />
            {errors.payerPhone && (
              <p id="payerPhone-error" className="mt-1.5 text-xs font-medium text-danger">
                {errors.payerPhone}
              </p>
            )}
          </div>
          {errors.form && <p className="text-xs font-medium text-danger">{errors.form}</p>}
          <button type="submit" disabled={busy !== null} className="flex h-12 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70">
            {busy === "pay" ? "Sending payment request..." : `Pay ${formatFcfa(funding.amountXaf)}`}
          </button>
          <p className="text-xs text-muted">The full price is held in escrow and is not released to the creator until the work is delivered and confirmed.</p>
        </form>
      )}

      {(isUnsettled(funding.status) || funding.status === "funded" || funding.status === "failed") && (
        <div className="flex flex-wrap items-center gap-3">
          {isUnsettled(funding.status) && (
            <button type="button" disabled={busy !== null} onClick={() => void check()} className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-heading hover:bg-surface-alt disabled:cursor-wait disabled:opacity-60">
              {busy === "check" ? "Checking…" : "Check status"}
            </button>
          )}
          <Link href="/brand/payments" className="text-sm font-semibold text-primary hover:text-primary-hover">
            Go to my payments
          </Link>
          <Link href="/brand/offers" className="text-sm font-semibold text-primary hover:text-primary-hover">
            Back to my hires
          </Link>
        </div>
      )}

      {funding.attempts.length > 0 && (
        <section aria-labelledby="attempts-heading" className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 id="attempts-heading" className="font-display text-base font-bold text-heading">
            Payment attempts
          </h2>
          <ul className="mt-3 divide-y divide-border-light text-sm">
            {funding.attempts.map((attempt) => (
              <li key={attempt.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-body">{formatDate(attempt.startedAt)}</span>
                <span className="font-medium text-heading">
                  {attempt.confirmation === "succeeded" ? "Confirmed" : attempt.confirmation === "failed" ? "Not completed" : attempt.confirmation === "indeterminate" ? "Unclear" : "Waiting for confirmation"}
                  {attempt.failure ? ` · ${FAILURE_CATEGORY_LABELS[attempt.failure.category] ?? "The provider declined the payment."}` : ""}
                  {attempt.simulated ? " · simulated" : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
