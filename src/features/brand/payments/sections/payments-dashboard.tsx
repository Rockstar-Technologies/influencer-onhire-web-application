"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { CardIcon, ChartIcon, CheckCircleIcon } from "@/components/shared/icons";
import { StatCard } from "@/components/shared/stat-card";
import { cn } from "@/lib/utils";
import { getEscrowSummary, listCampaignPayments } from "@/services/payments.service";
import type { CampaignPayment, EscrowSummary, PaymentInfluencer } from "@/types/payment";
import { METHOD_LABELS, formatAmount, formatDate, formatNumber } from "../payment-format";
import { FundCampaignDialog } from "./fund-campaign-dialog";
import { PaymentDetailsDialog, PayoutRequestDialog, ReceiptDialog, StatusPill } from "./payment-dialogs";

type OpenDialog =
  | { kind: "fund" }
  | { kind: "details" | "request" | "receipt"; payment: CampaignPayment }
  | null;

function RowAction({ payment, onOpen }: { payment: CampaignPayment; onOpen: (dialog: OpenDialog) => void }) {
  const buttonClass =
    "rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] font-semibold text-heading shadow-sm transition-colors hover:border-primary-border hover:bg-primary-light hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  if (payment.status === "payout_requested") {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <button type="button" className={buttonClass} onClick={() => onOpen({ kind: "request", payment })}>
          View Request
        </button>
        <span className="text-xs text-muted">Awaiting platform review</span>
      </div>
    );
  }

  if (payment.status === "released") {
    return (
      <button type="button" className={buttonClass} onClick={() => onOpen({ kind: "receipt", payment })}>
        Receipt
      </button>
    );
  }

  return (
    <button type="button" className={buttonClass} onClick={() => onOpen({ kind: "details", payment })}>
      View Details
    </button>
  );
}

export function PaymentsDashboard({
  query,
  initialPayments,
  initialSummary,
  influencers,
  steps,
}: {
  query: string;
  initialPayments: CampaignPayment[];
  initialSummary: EscrowSummary;
  influencers: PaymentInfluencer[];
  steps: ReactNode;
}) {
  const [payments, setPayments] = useState(initialPayments);
  const [summary, setSummary] = useState(initialSummary);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? payments.filter(
        (payment) =>
          payment.campaignTitle.toLowerCase().includes(needle) ||
          payment.influencer.name.toLowerCase().includes(needle)
      )
    : payments;

  async function handleFunded(payment: CampaignPayment) {
    const [nextPayments, nextSummary] = await Promise.all([listCampaignPayments(), getEscrowSummary()]);
    setPayments(nextPayments);
    setSummary(nextSummary);
    setDialog(null);
    setHighlightId(payment.id);
    setToast(`${formatAmount(payment.amount)} placed in escrow for "${payment.campaignTitle}".`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading sm:text-3xl">Payments &amp; Escrow</h1>
          <p className="mt-2 text-sm text-muted sm:text-base">
            Track funds you&apos;ve placed in escrow and released to the influencers you&apos;ve hired.
          </p>
        </div>
        <Button type="button" onClick={() => setDialog({ kind: "fund" })}>
          + Fund a Campaign
        </Button>
      </div>

      {steps}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Funded"
          value={formatNumber(summary.totalFunded)}
          unit="FCFA"
          icon={<CardIcon />}
          accent="bg-heading/5 text-heading"
        />
        <StatCard
          label="Currently In Escrow"
          value={formatNumber(summary.inEscrow)}
          unit="FCFA"
          icon={<CardIcon />}
          accent="bg-primary-light text-primary"
        />
        <StatCard
          label="Released to Influencers"
          value={formatNumber(summary.released)}
          unit="FCFA"
          icon={<CheckCircleIcon />}
          accent="bg-success/10 text-success"
        />
        <StatCard
          label="Active Campaigns"
          value={String(summary.activeCampaigns)}
          icon={<ChartIcon />}
          accent="bg-heading/5 text-heading"
        />
      </div>

      <section className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-heading">Your Campaign Payments</h2>
          {needle && (
            <p className="text-sm text-body">
              {visible.length} result{visible.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo; ·{" "}
              <Link href="/brand/payments" className="font-semibold text-primary hover:text-primary-hover">
                Clear search
              </Link>
            </p>
          )}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead>
              <tr className="bg-surface-alt text-[11px] font-semibold uppercase tracking-wider text-muted [&>th:first-child]:rounded-l-lg [&>th:last-child]:rounded-r-lg">
                <th className="px-4 py-3 font-semibold">Campaign</th>
                <th className="px-4 py-3 font-semibold">Influencer</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Payment Method</th>
                <th className="px-4 py-3 font-semibold">Date Funded</th>
                <th className="px-4 py-3 font-semibold">Escrow Status</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light [&>tr:first-child]:border-t-0">
              {visible.map((payment) => (
                <tr
                  key={payment.id}
                  className={cn(
                    "transition-colors hover:bg-surface-alt/70",
                    highlightId === payment.id && "bg-primary-light/60 hover:bg-primary-light/60"
                  )}
                >
                  <td className="px-4 py-4 font-medium text-heading">{payment.campaignTitle}</td>
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light text-[10px] font-bold text-primary">
                        {payment.influencer.initials}
                      </span>
                      <span className="font-semibold text-heading">{payment.influencer.name}</span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold tabular-nums text-heading">{formatAmount(payment.amount)}</td>
                  <td className="px-4 py-4 text-body">{METHOD_LABELS[payment.method]}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-body">{formatDate(payment.fundedAt)}</td>
                  <td className="px-4 py-4">
                    <StatusPill status={payment.status} />
                  </td>
                  <td className="px-4 py-4">
                    <RowAction payment={payment} onOpen={setDialog} />
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-body">
                    No campaign payments match &ldquo;{query}&rdquo;. Try a campaign or influencer name.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {dialog?.kind === "fund" && (
        <FundCampaignDialog influencers={influencers} onClose={() => setDialog(null)} onFunded={handleFunded} />
      )}
      {dialog?.kind === "details" && <PaymentDetailsDialog payment={dialog.payment} onClose={() => setDialog(null)} />}
      {dialog?.kind === "request" && <PayoutRequestDialog payment={dialog.payment} onClose={() => setDialog(null)} />}
      {dialog?.kind === "receipt" && <ReceiptDialog payment={dialog.payment} onClose={() => setDialog(null)} />}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[70] flex max-w-sm items-start gap-3 rounded-xl bg-heading px-4 py-3 text-sm text-white shadow-2xl"
        >
          <span className="mt-0.5 text-success">
            <CheckCircleIcon />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}
