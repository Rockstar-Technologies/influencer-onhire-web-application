"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/shared/button";
import { Modal } from "@/components/shared/modal";
import { formatDate, formatFcfa } from "@/lib/format";
import type { CreatorCampaignEarning } from "@/types/earnings";

function DetailRows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-border-light rounded-xl border border-border">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[9rem_1fr] gap-3 px-4 py-2.5 text-sm">
          <dt className="text-muted">{label}</dt>
          <dd className="font-medium text-heading">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function RequestPayoutDialog({
  earning,
  submitting,
  onClose,
  onConfirm,
}: {
  earning: CreatorCampaignEarning;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <Modal titleId="request-payout-title" onClose={onClose}>
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Step 3 · You Request Payout</p>
      <h2 id="request-payout-title" className="mt-1 text-xl font-bold text-heading">
        Request payout for {earning.campaignTitle}
      </h2>
      <p className="mt-1 text-sm text-body">
        The platform checks your deliverables, then releases{" "}
        <strong className="font-semibold text-heading">{formatFcfa(earning.amount)}</strong> to your available balance.
      </p>

      <h3 className="mt-5 text-sm font-semibold text-heading">Deliverables for {earning.brandName}</h3>
      <ul className="mt-2 flex flex-col gap-1.5 text-sm text-body">
        {earning.deliverables.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>

      <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm text-heading">
        <input
          id="confirm-delivered"
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
        />
        I confirm every deliverable above is published and live.
      </label>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={!confirmed || submitting}
          className="disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Sending request…" : "Submit Payout Request"}
        </Button>
      </div>
    </Modal>
  );
}

export function EarningReceiptDialog({ earning, onClose }: { earning: CreatorCampaignEarning; onClose: () => void }) {
  return (
    <Modal titleId="earning-receipt-title" onClose={onClose}>
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Payout receipt</p>
      <h2 id="earning-receipt-title" className="mt-1 text-xl font-bold text-heading">
        {earning.campaignTitle}
      </h2>
      <div className="mt-5 rounded-xl bg-success/10 px-4 py-5 text-center">
        <p className="text-xs uppercase tracking-wider text-success">Released to you</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-heading">{formatFcfa(earning.amount)}</p>
      </div>
      <div className="mt-5">
        <DetailRows
          rows={[
            ["Receipt no.", earning.reference],
            ["Paid by", earning.brandName],
            ["Date funded", formatDate(earning.fundedAt)],
            ["Payout requested", earning.payoutRequestedAt ? formatDate(earning.payoutRequestedAt) : "—"],
            ["Date released", earning.releasedAt ? formatDate(earning.releasedAt) : "—"],
          ]}
        />
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button type="button" onClick={() => window.print()}>
          Print Receipt
        </Button>
      </div>
    </Modal>
  );
}
