"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/shared/button";
import { OFFER_KIND_LABELS } from "@/features/offers/offer-status";
import type { FailureNotice } from "@/features/offers/failure";
import { HIRE_VALID_DAYS, hireAnswerBy, startDateProblem } from "@/features/offers/mapping";
import type { OfferKind } from "@/features/offers/mapping";
import type { DeclineReason, OfferView } from "@/lib/api/schemas";
import { formatDate, formatFcfa } from "@/lib/format";

/** What the creator decided: accepting a direct hire may carry the chosen start date; declining always carries one of the API's reasons. */
export type Answer = { kind: "accept"; startDate: string | null } | { kind: "decline"; reasonId: number };

interface Props {
  offer: OfferView;
  kind: OfferKind;
  reasons: DeclineReason[];
  responding: boolean;
  /** Another answer is being sent: every button is off until it finishes. */
  locked: boolean;
  notice: FailureNotice | null;
  onAnswer: (answer: Answer) => void;
}

const todayLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export function PendingRequestCard({ offer, kind, reasons, responding, locked, notice, onAnswer }: Props) {
  const [declining, setDeclining] = useState(false);
  const [reasonId, setReasonId] = useState("");
  const [startDate, setStartDate] = useState("");
  const reasonField = `decline-reason-${offer.id}`;
  const startField = `start-date-${offer.id}`;
  const dateProblem = startDateProblem(startDate, todayLocal());
  const answerBy = hireAnswerBy(offer);
  const brand = offer.brandName ?? "The brand";
  const answerable = kind !== "application"; // a creator's own application is answered by the brand

  const facts: [string, string][] = [
    ["Price", formatFcfa(offer.priceXaf)],
    ...(offer.platform ? ([["Platform", offer.platform.name]] as [string, string][]) : []),
    ...(kind === "direct_hire" && offer.hire?.durationLabel ? ([["Duration", offer.hire.durationLabel]] as [string, string][]) : []),
    ...(offer.campaign ? ([["Campaign dates", `${formatDate(offer.campaign.startDate)} → ${formatDate(offer.campaign.endDate)}`]] as [string, string][]) : []),
  ];

  return (
    <article className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm" aria-label={`${OFFER_KIND_LABELS[kind]} ${offer.reference}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{OFFER_KIND_LABELS[kind]}</p>
          <h2 className="mt-1 text-base font-bold text-heading sm:text-lg">
            {kind === "direct_hire" ? `${brand} wants to hire you` : (offer.campaign?.title ?? "Campaign")}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {brand} · {offer.reference}
            {offer.campaign ? ` · ${offer.campaign.reference}` : ""}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {answerable ? "Pending Your Response" : "Waiting for the brand"}
        </span>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 text-lg font-bold text-heading">{value}</dd>
          </div>
        ))}
      </dl>

      {kind === "direct_hire" && offer.hire && (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {offer.hire.contactName && (
            <div>
              <dt className="text-muted">Contact</dt>
              <dd className="font-medium text-heading">
                {offer.hire.contactName}
                {offer.hire.location ? ` · ${offer.hire.location}` : ""}
              </dd>
            </div>
          )}
          {offer.hire.socialHandle && (
            <div>
              <dt className="text-muted">Their handle</dt>
              <dd className="font-medium text-heading">{offer.hire.socialHandle}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted">Payment method</dt>
            <dd className="font-medium text-heading">{offer.hire.paymentMethod.name}</dd>
          </div>
          {offer.hire.promotion && (
            <div className="sm:col-span-2">
              <dt className="text-muted">What they want to promote</dt>
              <dd className="font-medium text-heading">{offer.hire.promotion}</dd>
            </div>
          )}
        </dl>
      )}

      {kind === "invitation" && (
        <p className="mt-4 text-sm text-body">
          The platform invited you to this campaign because your niche, city and rates fit it. Accepting books you for the campaign&apos;s dates at the price above.
        </p>
      )}
      {kind === "application" && offer.pitch && (
        <p className="mt-4 text-sm text-body">
          <span className="font-medium text-heading">Your pitch:</span> {offer.pitch}
        </p>
      )}
      {answerBy && (
        <p className="mt-3 text-sm text-muted">
          Answer by {formatDate(answerBy.toISOString())} (hire requests expire after {HIRE_VALID_DAYS} days).
        </p>
      )}

      {answerable && declining ? (
        <div className="mt-4 rounded-xl border border-border bg-surface-alt p-4">
          <label htmlFor={reasonField} className="text-sm font-semibold text-heading">
            Why are you declining? <span className="font-normal text-muted">(required)</span>
          </label>
          <select id={reasonField} value={reasonId} onChange={(event) => setReasonId(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-heading outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:max-w-sm">
            <option value="">Choose a reason</option>
            {reasons.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.label}
              </option>
            ))}
          </select>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => onAnswer({ kind: "decline", reasonId: Number(reasonId) })} disabled={locked || !reasonId} className="disabled:cursor-not-allowed disabled:opacity-60">
              {responding ? "Declining…" : "Confirm Decline"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setDeclining(false)} disabled={locked}>
              Keep Request
            </Button>
          </div>
        </div>
      ) : answerable ? (
        <div className="mt-4 space-y-3">
          {kind === "direct_hire" && (
            <div>
              <label htmlFor={startField} className="text-sm font-semibold text-heading">
                Start date <span className="font-normal text-muted">(optional, defaults to today)</span>
              </label>
              <input id={startField} type="date" value={startDate} min={todayLocal()} onChange={(event) => setStartDate(event.target.value)} aria-invalid={dateProblem ? true : undefined} aria-describedby={dateProblem ? `${startField}-error` : undefined} className="mt-2 block h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-heading outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:max-w-xs" />
              {dateProblem && (
                <p id={`${startField}-error`} className="mt-1.5 text-xs font-medium text-danger">
                  {dateProblem}
                </p>
              )}
              {offer.hire?.durationDays && <p className="mt-1.5 text-xs text-muted">The booking runs for {offer.hire.durationDays} days from the start date.</p>}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => onAnswer({ kind: "accept", startDate: kind === "direct_hire" && startDate ? startDate : null })} disabled={locked || !!dateProblem} className="disabled:cursor-not-allowed disabled:opacity-50">
              {responding ? "Working…" : kind === "invitation" ? "Accept Campaign" : "Accept Request"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setDeclining(true)} disabled={locked}>
              Decline
            </Button>
          </div>
        </div>
      ) : null}

      {notice && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-light px-4 py-3 text-sm text-danger">
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
    </article>
  );
}
