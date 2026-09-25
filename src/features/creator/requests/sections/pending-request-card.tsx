"use client";

import { useState } from "react";
import { Button } from "@/components/shared/button";
import type { CampaignRequest } from "@/types/campaign-request";
import { formatFrs, formatReceived } from "../request-format";

interface PendingRequestCardProps {
  request: CampaignRequest;
  busy: boolean;
  activeCampaigns: number;
  declineReasons: string[];
  responding: boolean;
  onAccept: () => void;
  onDecline: (reason?: string) => void;
}

export function PendingRequestCard({
  request,
  busy,
  activeCampaigns,
  declineReasons,
  responding,
  onAccept,
  onDecline,
}: PendingRequestCardProps) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const reasonId = `decline-reason-${request.id}`;

  const facts: [string, string][] = [
    ["Budget", formatFrs(request.budget)],
    ["Duration", `${request.durationDays} days`],
    ["Deliverables", request.deliverablesSummary],
  ];

  return (
    <article className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-heading sm:text-lg">
            New {request.niche} Campaign Available — {formatFrs(request.budget)}, {request.durationDays} Days, {request.city}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {request.brandName} · {request.campaignTitle} · {formatReceived(request.receivedAt)}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          Pending Your Response
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

      {request.matchReasons.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-medium text-heading">Why you matched</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {request.matchReasons.map((match) => (
              <li
                key={match}
                className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {match}
              </li>
            ))}
          </ul>
        </div>
      )}

      {busy && (
        <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="text-sm font-semibold text-warning">
            You currently have {activeCampaigns} active campaigns in progress.
          </p>
          <p className="mt-1 text-[13px] text-body">
            You&apos;ll be able to accept new requests once your current campaigns are delivered and paid out. You can
            still decline this one now if it doesn&apos;t fit your schedule.
          </p>
        </div>
      )}

      {declining ? (
        <div className="mt-4 rounded-xl border border-border bg-surface-alt p-4">
          <label htmlFor={reasonId} className="text-sm font-semibold text-heading">
            Let {request.brandName} know why <span className="font-normal text-muted">(optional)</span>
          </label>
          <select
            id={reasonId}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-heading outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:max-w-sm"
          >
            <option value="">No reason given</option>
            {declineReasons.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted">
            {request.brandName} gets a polite auto-message and we suggest other matching creators.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => onDecline(reason || undefined)}
              disabled={responding}
              className="disabled:cursor-not-allowed disabled:opacity-60"
            >
              {responding ? "Declining…" : "Confirm Decline"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setDeclining(false)} disabled={responding}>
              Keep Request
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={onAccept}
            disabled={busy || responding}
            title={busy ? "Finish your active campaigns to accept new requests" : undefined}
            className="disabled:cursor-not-allowed disabled:opacity-50"
          >
            {responding ? "Accepting…" : "Accept Campaign"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setDeclining(true)} disabled={responding}>
            Decline
          </Button>
        </div>
      )}
    </article>
  );
}
