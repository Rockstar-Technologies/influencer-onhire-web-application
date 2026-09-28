import { FiInbox } from "react-icons/fi";
import { listPayments, splitPayment } from "@/services/payments.service";
import type { PaymentQuery } from "@/types/payments";
import { PaymentFilters } from "./payment-filters";
import { PaymentTable } from "./payment-table";

export async function PaymentLedger({ query }: { query: PaymentQuery }) {
  const payments = await listPayments(query);
  const rows = payments.map((payment) => ({ ...payment, split: splitPayment(payment.gross) }));
  const isFiltered = query.q !== "" || query.status !== "all";

  return (
    <section aria-labelledby="ledger-heading" className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h2 id="ledger-heading" className="font-display text-base font-bold text-heading">
          Master Ledger
        </h2>
        <p className="mt-1 text-sm text-muted">Gross deposit, platform earnings and net payout for every campaign payment.</p>
      </div>

      <PaymentFilters query={query} />

      {rows.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <FiInbox className="text-muted" size={28} aria-hidden />
          <p className="mt-3 font-display text-base font-bold text-heading">
            {isFiltered ? "No payments match these filters" : "No payments yet"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {isFiltered ? "Try another status or search term." : "Deposits appear here as soon as a brand funds a campaign."}
          </p>
        </div>
      ) : (
        <PaymentTable rows={rows} />
      )}
    </section>
  );
}
