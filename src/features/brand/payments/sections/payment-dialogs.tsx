"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/shared/button";
import { Modal } from "@/components/shared/modal";
import { cn } from "@/lib/utils";
import type { CampaignPayment } from "@/types/payment";
import { METHOD_LABELS, STATUS_LABELS, STATUS_STYLES, formatAmount, formatDate } from "../payment-format";

export function StatusPill({ status }: { status: CampaignPayment["status"] }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}

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

function Timeline({ payment }: { payment: CampaignPayment }) {
  const steps = [
    { label: "Funded", date: payment.fundedAt, done: true },
    { label: "Held in escrow", date: payment.fundedAt, done: true },
    { label: "Payout requested", date: payment.payoutRequestedAt, done: Boolean(payment.payoutRequestedAt) },
    { label: "Released to influencer", date: payment.releasedAt, done: payment.status === "released" },
  ];

  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step) => (
        <li key={step.label} className="flex items-center gap-3 text-sm">
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
              step.done ? "border-success bg-success text-white" : "border-border bg-surface"
            )}
          >
            {step.done && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span className={step.done ? "font-medium text-heading" : "text-muted"}>{step.label}</span>
          {step.done && step.date && <span className="ml-auto text-xs text-muted">{formatDate(step.date)}</span>}
        </li>
      ))}
    </ol>
  );
}

function DialogHeader({ id, eyebrow, title, payment }: { id: string; eyebrow: string; title: string; payment: CampaignPayment }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
        <h2 id={id} className="mt-1 text-xl font-bold text-heading">
          {title}
        </h2>
      </div>
      <StatusPill status={payment.status} />
    </div>
  );
}

function Deliverables({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="text-sm text-muted">The influencer hasn&apos;t submitted deliverables yet.</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5 text-sm text-body">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function PaymentDetailsDialog({ payment, onClose }: { payment: CampaignPayment; onClose: () => void }) {
  return (
    <Modal titleId="payment-details-title" onClose={onClose}>
      <DialogHeader id="payment-details-title" eyebrow="Escrow payment" title={payment.campaignTitle} payment={payment} />
      <p className="mt-2 text-sm text-body">
        {formatAmount(payment.amount)} is held safely on the platform until {payment.influencer.name} delivers the
        campaign and requests payout.
      </p>
      <div className="mt-5">
        <DetailRows
          rows={[
            ["Influencer", payment.influencer.name],
            ["Amount", formatAmount(payment.amount)],
            ["Payment method", `${METHOD_LABELS[payment.method]} · ${payment.payerPhone}`],
            ["Date funded", formatDate(payment.fundedAt)],
            ["Reference", payment.reference],
          ]}
        />
      </div>
      <h3 className="mt-6 text-sm font-semibold text-heading">Progress</h3>
      <div className="mt-3">
        <Timeline payment={payment} />
      </div>
      <div className="mt-6 flex justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}

export function PayoutRequestDialog({ payment, onClose }: { payment: CampaignPayment; onClose: () => void }) {
  return (
    <Modal titleId="payout-request-title" onClose={onClose}>
      <DialogHeader id="payout-request-title" eyebrow="Payout request" title={payment.campaignTitle} payment={payment} />
      <p className="mt-2 text-sm text-body">
        {payment.influencer.name} has marked this campaign as delivered and requested payout of{" "}
        {formatAmount(payment.amount)}.
      </p>
      <div className="mt-5">
        <DetailRows
          rows={[
            ["Requested by", payment.influencer.name],
            ["Amount", formatAmount(payment.amount)],
            ["Requested on", payment.payoutRequestedAt ? formatDate(payment.payoutRequestedAt) : "—"],
            ["Reference", payment.reference],
          ]}
        />
      </div>
      <h3 className="mt-6 text-sm font-semibold text-heading">Submitted deliverables</h3>
      <div className="mt-3">
        <Deliverables items={payment.deliverables} />
      </div>
      <p className="mt-5 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
        Awaiting platform review — our team is confirming delivery. Funds are released automatically once it&apos;s
        approved.
      </p>
      <div className="mt-6 flex justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}

export function ReceiptDialog({ payment, onClose }: { payment: CampaignPayment; onClose: () => void }) {
  return (
    <Modal titleId="receipt-title" onClose={onClose}>
      <DialogHeader id="receipt-title" eyebrow="Payment receipt" title={payment.campaignTitle} payment={payment} />
      <div className="mt-5 rounded-xl bg-surface-alt px-4 py-5 text-center">
        <p className="text-xs uppercase tracking-wider text-muted">Amount released</p>
        <p className="mt-1 text-3xl font-extrabold tabular-nums text-heading">{formatAmount(payment.amount)}</p>
      </div>
      <div className="mt-5">
        <DetailRows
          rows={[
            ["Receipt no.", payment.reference],
            ["Paid to", payment.influencer.name],
            ["Payment method", `${METHOD_LABELS[payment.method]} · ${payment.payerPhone}`],
            ["Date funded", formatDate(payment.fundedAt)],
            ["Date released", payment.releasedAt ? formatDate(payment.releasedAt) : "—"],
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
