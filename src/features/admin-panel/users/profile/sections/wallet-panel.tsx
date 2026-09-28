import { FiLock } from "react-icons/fi";
import { cn, formatPrice, formatRelativeTime } from "@/lib/utils";
import type { PlatformUser, WalletTransactionKind, WalletTransaction } from "@/types/user-management";

const KIND_LABELS: Record<WalletTransactionKind, string> = {
  "escrow-held": "Held in escrow",
  released: "Released",
  refunded: "Refunded",
  withdrawal: "Withdrawal",
  deposit: "Deposit",
};

export function WalletPanel({ wallet, transactions }: { wallet: PlatformUser["wallet"]; transactions: WalletTransaction[] }) {
  return (
    <section aria-labelledby="wallet-heading" className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 id="wallet-heading" className="font-display text-base font-bold text-heading">
        Wallet &amp; Escrow
      </h2>
      <p className="mt-1 text-sm text-muted">Campaign money is held in escrow and released once the work is approved.</p>

      <dl className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-surface-alt p-4">
          <dt className="text-xs text-body">Available balance</dt>
          <dd className="mt-1 font-display text-xl font-bold text-heading">{formatPrice(wallet.available)}</dd>
        </div>
        <div className="rounded-xl bg-surface-alt p-4">
          <dt className="flex items-center gap-1.5 text-xs text-body">
            <FiLock aria-hidden /> In escrow
          </dt>
          <dd className="mt-1 font-display text-xl font-bold text-heading">{formatPrice(wallet.inEscrow)}</dd>
        </div>
      </dl>

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted">Recent transactions</h3>
      {transactions.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No transactions yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {transactions.map((transaction) => (
            <li key={transaction.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm text-heading">{transaction.description}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {KIND_LABELS[transaction.kind]} · <time dateTime={transaction.date}>{formatRelativeTime(transaction.date)}</time>
                </p>
              </div>
              <span className={cn("shrink-0 text-sm font-semibold", transaction.amount < 0 ? "text-body" : "text-success-strong")}>
                {transaction.amount < 0 ? "−" : "+"}
                {formatPrice(Math.abs(transaction.amount))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
