"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { CardIcon, ChartIcon, CheckCircleIcon, ClockIcon } from "@/components/shared/icons";
import { StatCard } from "@/components/shared/stat-card";
import { formatFcfa, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  getEarningsSummary,
  listCreatorCampaignEarnings,
  listWithdrawals,
  requestPayout,
} from "@/services/earnings.service";
import type { CreatorCampaignEarning, EarningsSummary, Withdrawal } from "@/types/earnings";
import { EarningReceiptDialog, RequestPayoutDialog } from "./earning-dialogs";
import { WithdrawPanel } from "./withdraw-panel";
import { WithdrawalHistory } from "./withdrawal-history";

const STATUS: Record<CreatorCampaignEarning["status"], { label: string; className: string }> = {
  held: { label: "On Hold (Escrow)", className: "bg-primary-light text-primary" },
  requested: { label: "Payout Requested", className: "bg-warning/10 text-warning" },
  released: { label: "Released", className: "bg-success/10 text-success" },
  refund_pending: { label: "Refund Pending", className: "bg-warning/10 text-warning" },
  refunded: { label: "Refunded", className: "bg-border-light text-body" },
};

type OpenDialog = { kind: "request" | "receipt"; earning: CreatorCampaignEarning } | null;

function Pill({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function EarningsDashboard({
  query,
  steps,
  minimumWithdrawal,
  initialSummary,
  initialEarnings,
  initialWithdrawals,
}: {
  query: string;
  steps: ReactNode;
  minimumWithdrawal: number;
  initialSummary: EarningsSummary;
  initialEarnings: CreatorCampaignEarning[];
  initialWithdrawals: Withdrawal[];
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [earnings, setEarnings] = useState(initialEarnings);
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [requesting, setRequesting] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Remount the withdraw form after a withdrawal so its amount resets to the new balance.
  const [withdrawKey, setWithdrawKey] = useState(0);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? earnings.filter(
        (item) => item.campaignTitle.toLowerCase().includes(needle) || item.brandName.toLowerCase().includes(needle)
      )
    : earnings;

  async function refresh() {
    const [nextSummary, nextEarnings, nextWithdrawals] = await Promise.all([
      getEarningsSummary(),
      listCreatorCampaignEarnings(),
      listWithdrawals(),
    ]);
    setSummary(nextSummary);
    setEarnings(nextEarnings);
    setWithdrawals(nextWithdrawals);
  }

  async function handleRequestPayout(earning: CreatorCampaignEarning) {
    setRequesting(true);
    try {
      await requestPayout(earning.id);
      await refresh();
      setDialog(null);
      setHighlight(earning.id);
      setToast(`Payout requested for "${earning.campaignTitle}". We'll release ${formatFcfa(earning.amount)} once delivery is confirmed.`);
    } catch {
      setToast("We couldn't send your payout request. Try again in a moment.");
    } finally {
      setRequesting(false);
    }
  }

  async function handleWithdrawn(withdrawal: Withdrawal) {
    await refresh();
    setWithdrawKey((key) => key + 1);
    setHighlight(withdrawal.id);
    setToast(`${formatFcfa(withdrawal.amount)} withdrawal request was received and is subject to review.`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-heading sm:text-3xl">Earnings &amp; Payouts</h1>
        <p className="mt-2 text-sm text-muted sm:text-base">
          Track campaign funds held for you and request payout once you&apos;ve delivered.
        </p>
      </div>

      {steps}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Available Balance" value={formatNumber(summary.availableBalance)} unit="FCFA" icon={<CheckCircleIcon />} accent="bg-success/10 text-success" />
        <StatCard label="In Escrow (On Hold)" value={formatNumber(summary.inEscrow)} unit="FCFA" icon={<CardIcon />} accent="bg-primary-light text-primary" />
        <StatCard label="Pending Payout Requests" value={formatNumber(summary.pendingPayout)} unit="FCFA" icon={<ClockIcon />} accent="bg-warning/10 text-warning" />
        <StatCard label="Total Earned All-Time" value={formatNumber(summary.totalEarned)} unit="FCFA" icon={<ChartIcon />} accent="bg-heading/5 text-heading" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-heading">Your Campaigns</h2>
            {needle && (
              <p className="text-sm text-body">
                {visible.length} result{visible.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo; ·{" "}
                <Link href="/creator/earnings" className="font-semibold text-primary hover:text-primary-hover">
                  Clear search
                </Link>
              </p>
            )}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="bg-surface-alt text-[11px] font-semibold uppercase tracking-wider text-muted [&>th:first-child]:rounded-l-lg [&>th:last-child]:rounded-r-lg">
                  <th className="px-4 py-3 font-semibold">Campaign</th>
                  <th className="px-4 py-3 font-semibold">Brand</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Escrow Status</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {visible.map((earning) => (
                  <tr
                    key={earning.id}
                    className={cn(
                      "transition-colors hover:bg-surface-alt/70",
                      highlight === earning.id && "bg-primary-light/60 hover:bg-primary-light/60"
                    )}
                  >
                    <td className="px-4 py-4 font-medium text-heading">{earning.campaignTitle}</td>
                    <td className="px-4 py-4 text-body">{earning.brandName}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold tabular-nums text-heading">{formatFcfa(earning.amount)}</td>
                    <td className="px-4 py-4">
                      <Pill className={STATUS[earning.status].className}>{STATUS[earning.status].label}</Pill>
                    </td>
                    <td className="px-4 py-4">
                      {earning.status === "held" && (
                        <button
                          type="button"
                          onClick={() => setDialog({ kind: "request", earning })}
                          className="whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
                        >
                          Request Payout
                        </button>
                      )}
                      {earning.status === "requested" && <Pill className="bg-heading/5 text-body">Awaiting Release</Pill>}
                      {earning.status === "released" && (
                        <button
                          type="button"
                          onClick={() => setDialog({ kind: "receipt", earning })}
                          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] font-semibold text-heading shadow-sm transition-colors hover:border-primary-border hover:bg-primary-light hover:text-primary"
                        >
                          Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-body">
                      No campaigns match &ldquo;{query}&rdquo;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <WithdrawPanel
          key={withdrawKey}
          availableBalance={summary.availableBalance}
          minimum={minimumWithdrawal}
          onWithdrawn={handleWithdrawn}
        />
      </div>

      <WithdrawalHistory withdrawals={withdrawals} highlightId={highlight} />

      {dialog?.kind === "request" && (
        <RequestPayoutDialog
          earning={dialog.earning}
          submitting={requesting}
          onClose={() => setDialog(null)}
          onConfirm={() => void handleRequestPayout(dialog.earning)}
        />
      )}
      {dialog?.kind === "receipt" && <EarningReceiptDialog earning={dialog.earning} onClose={() => setDialog(null)} />}

      {toast && (
        <div role="status" className="fixed bottom-6 right-6 z-[70] max-w-sm rounded-xl bg-heading px-4 py-3 text-sm text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
