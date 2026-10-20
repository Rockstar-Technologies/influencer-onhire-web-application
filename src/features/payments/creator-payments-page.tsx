import { loadCreatorPayments } from "./server";
import { creatorPaymentInfo, TONE_CLASS } from "./labels";
import { DeliveryReportForm } from "./delivery-report-form";
import { WithdrawPanel } from "./withdraw-panel";
import { formatDate, formatFcfa } from "@/lib/format";
import { cn } from "@/lib/utils";

const RETURN_TO = "/creator/payments";

/** The creator's payments, wallet and withdrawals, exactly as the API reports them. Fee and net are the amounts frozen when the brand's payment was confirmed. */
export async function CreatorPaymentsPage({ returnTo = RETURN_TO }: { returnTo?: string }) {
  const { payments, paymentsNext, wallet, withdrawals } = await loadCreatorPayments(returnTo);
  const cards = [
    { label: "Available to withdraw", value: wallet.availableXaf, hint: "Real, released earnings not already requested" },
    { label: "In escrow", value: wallet.inEscrowXaf, hint: "Paid by brands, waiting for your delivery" },
    { label: "Awaiting release", value: wallet.awaitingReleaseXaf, hint: "Delivery reported, not yet released" },
    { label: "Withdrawals reserved", value: wallet.pendingWithdrawalsXaf, hint: "Requested and not yet decided" },
    { label: "Total earnings", value: wallet.totalEarningsXaf, hint: "Take-home pay, after the platform fee" },
    { label: "Paid out", value: wallet.completedWithdrawalsXaf, hint: "Withdrawals confirmed as completed" },
  ];
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-heading sm:text-3xl">Earnings &amp; Payouts</h1>
        <p className="mt-2 text-sm text-body">Amounts here are your take-home pay after the platform fee, as recorded when the brand paid.</p>
      </div>

      <section aria-label="Wallet" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{c.label}</p>
            <p className="mt-1 font-display text-xl font-extrabold tabular-nums text-heading">{formatFcfa(c.value)}</p>
            <p className="mt-1 text-xs text-muted">{c.hint}</p>
          </div>
        ))}
      </section>

      {wallet.includesSimulatedFunds && (
        <p className="rounded-xl border border-warning/30 bg-warning-light px-4 py-3 text-sm text-warning">
          Some of your payments are simulated (test money). Simulated balance: <strong>{formatFcfa(wallet.simulated.balanceXaf)}</strong>. It is not real money and can&apos;t be withdrawn. The figures above count real money only.
        </p>
      )}

      <WithdrawPanel wallet={wallet} withdrawals={withdrawals} />

      <section aria-labelledby="creator-payments-heading" className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 id="creator-payments-heading" className="font-display text-base font-bold text-heading">Your payments</h2>
        {payments.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted">No payments yet. When a brand pays for a booking, the money shows here held for you.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {payments.map((p) => {
              const info = creatorPaymentInfo(p);
              return (
                <li key={p.id} className="space-y-3 py-4">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row">
                    <div>
                      <p className="text-sm font-semibold text-heading">{p.engagement.campaign?.title ?? "Direct hire"} · {p.brand.name}</p>
                      <p className="text-xs text-muted">{p.reference} · paid {formatDate(p.fundedAt)}</p>
                    </div>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", TONE_CLASS[info.tone])}>{info.label}</span>
                      {p.simulated && <span className="rounded-full bg-warning-light px-2 py-0.5 text-[11px] font-semibold text-warning">Simulated</span>}
                    </span>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-sm">
                    <div><dt className="text-xs text-muted">Paid by brand</dt><dd className="tabular-nums text-heading">{formatFcfa(p.amountXaf)}</dd></div>
                    <div><dt className="text-xs text-muted">Platform fee ({p.feeRatePct}%)</dt><dd className="tabular-nums text-heading">{formatFcfa(p.feeXaf)}</dd></div>
                    <div><dt className="text-xs text-muted">Your take-home</dt><dd className="font-semibold tabular-nums text-heading">{formatFcfa(p.netXaf)}</dd></div>
                  </dl>
                  <p className="text-sm text-body">{info.note}</p>
                  {p.dispute?.status === "open" && p.dispute.reason && <p className="text-xs text-muted">Brand&apos;s reason: {p.dispute.reason}</p>}
                  {p.actions.canSubmitDelivery && <DeliveryReportForm paymentId={p.id} returnTo={returnTo} />}
                </li>
              );
            })}
          </ul>
        )}
        {paymentsNext && <p className="mt-4 text-center text-xs text-muted">Showing your most recent payments.</p>}
      </section>
    </div>
  );
}
