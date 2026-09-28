import { listMonthlyPaymentStats } from "@/services/payments.service";
import type { PaymentQuery } from "@/types/payments";
import { EscrowFlow } from "./sections/escrow-flow";
import { MonthlyAnalytics } from "./sections/monthly-analytics";
import { PaymentLedger } from "./sections/payment-ledger";
import { PaymentStats } from "./sections/payment-stats";

export async function PaymentsPage({ query }: { query: PaymentQuery }) {
  const monthly = await listMonthlyPaymentStats();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-heading sm:text-3xl">Payments</h1>
          <p className="mt-2 max-w-2xl text-sm text-body">
            Master ledger for every escrow deposit. Brands pay 100% up front; the platform keeps a 20% service fee and releases the rest to
            the creator once delivery is confirmed.
          </p>
        </div>
        <span className="self-start rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-body sm:self-auto">
          All amounts in CFA
        </span>
      </div>

      <EscrowFlow />
      <PaymentStats />
      <MonthlyAnalytics stats={monthly} />
      <PaymentLedger query={query} />
    </div>
  );
}
