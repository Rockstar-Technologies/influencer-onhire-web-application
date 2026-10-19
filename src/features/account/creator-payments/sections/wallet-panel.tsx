import { StatusBadge, type BadgeStyle } from "@/components/shared/status-badge";
import { lookupOr } from "@/lib/domain/labels";
import { formatDate, formatPrice, maskPhone } from "@/lib/utils";
import type { CreatorWallet, Withdrawal } from "@/types/payments";
import { WithdrawDialog } from "./withdraw-dialog";
import { PAYMENT_METHOD_LABELS } from "@/lib/domain/labels";

const UNKNOWN_BADGE: BadgeStyle = { label: "Unknown", badge: "bg-border-light text-body", dot: "bg-muted" };

const WITHDRAWAL_STYLES: Record<Withdrawal["status"], BadgeStyle> = {
  processing: { label: "Processing", badge: "bg-warning-light text-warning", dot: "bg-warning" },
  completed: { label: "Sent", badge: "bg-success-light text-success-strong", dot: "bg-success" },
  requested: { label: "Requested", badge: "bg-warning-light text-warning", dot: "bg-warning" },
  under_review: { label: "Under review", badge: "bg-warning-light text-warning", dot: "bg-warning" },
  approved: { label: "Approved", badge: "bg-info-light text-info", dot: "bg-info" },
  rejected: { label: "Rejected", badge: "bg-danger-light text-danger-strong", dot: "bg-danger" },
  cancelled: { label: "Cancelled", badge: "bg-border-light text-body", dot: "bg-muted" },
  failed: { label: "Failed", badge: "bg-danger-light text-danger-strong", dot: "bg-danger" },
};

export function WalletPanel({ wallet, withdrawals, minimum }: { wallet: CreatorWallet; withdrawals: Withdrawal[]; minimum: number }) {
  return (
    <section aria-labelledby="wallet-heading" className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="wallet-heading" className="font-display text-base font-bold text-heading">
            Your balance
          </h2>
          <p className="mt-2 font-display text-3xl font-extrabold text-heading tabular-nums">{formatPrice(wallet.available)}</p>
          <p className="mt-1 text-sm text-muted">
            {wallet.processing > 0 && <>{formatPrice(wallet.processing)} pending review · </>}
            {formatPrice(wallet.withdrawn)} withdrawn so far
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <WithdrawDialog available={wallet.available} minimum={minimum} />
          {wallet.available < minimum && <p className="text-xs text-muted">You can withdraw once you have {formatPrice(minimum)}.</p>}
        </div>
      </div>

      <h3 className="mt-6 mb-3 text-sm font-semibold text-heading">Withdrawal history</h3>
      {withdrawals.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted">No withdrawals yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs font-semibold tracking-wide text-muted uppercase">
              <tr>
                <th className="py-2 pr-4 font-semibold">Date</th>
                <th className="py-2 pr-4 font-semibold">Sent to</th>
                <th className="py-2 pr-4 text-right font-semibold">Amount</th>
                <th className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {withdrawals.map((withdrawal) => (
                <tr key={withdrawal.id}>
                  <td className="py-3 pr-4 whitespace-nowrap text-body">{formatDate(withdrawal.requestedAt)}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <span className="font-medium text-heading">{PAYMENT_METHOD_LABELS[withdrawal.method]}</span> <span className="text-body tabular-nums">{maskPhone(withdrawal.phone)}</span>
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold whitespace-nowrap text-heading tabular-nums">{formatPrice(withdrawal.amount)}</td>
                  <td className="py-3">
                    <StatusBadge {...lookupOr(WITHDRAWAL_STYLES, withdrawal.status, UNKNOWN_BADGE)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
