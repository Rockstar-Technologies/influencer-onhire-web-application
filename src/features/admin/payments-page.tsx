import Link from "next/link";
import { formatFcfa } from "@/lib/format";
import { PAYMENT_STATUSES, loadPayments } from "./server";
import type { PaymentQuery } from "./server";
import { PAYMENT_STATUS_TEXT, dateTime, label } from "./mapping";
import { AdminHeader, Empty, FilterChips, MoreLink, Pill, queryHref } from "./ui";

const BASE = "/admin/payments";
const TONE = { held: "wait", requested: "warn", released: "good", refund_pending: "bad", refunded: "neutral" } as const;

/** Payments as staff see them (the platform fee and the creator's net are frozen when a payment is confirmed). Simulated money is labelled. */
export async function PaymentsAdminPage({ query }: { query: PaymentQuery }) {
  const page = await loadPayments(query);
  const href = (change: Partial<Record<keyof PaymentQuery, string | boolean | null>>) => queryHref(BASE, { status: query.status, releasable: query.releasable, disputed: query.disputed, invoice: query.invoice, ...change });
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminHeader title="Payments" text="Escrow payments, newest first. Open one to see its delivery, any dispute, and to release it when it is allowed." />
      <form action={BASE} role="search" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <div>
          <label htmlFor="pay-invoice" className="text-xs font-semibold uppercase tracking-wide text-muted">
            Invoice number
          </label>
          <input id="pay-invoice" name="invoice" defaultValue={query.invoice ?? ""} placeholder="INV-123" maxLength={24} className="mt-1 h-10 w-48 rounded-lg border border-border bg-surface px-3 text-sm text-heading outline-none focus:border-primary" />
        </div>
        {query.status && <input type="hidden" name="status" value={query.status} />}
        <button type="submit" className="h-10 rounded-lg bg-navy px-5 text-sm font-semibold text-white hover:bg-navy-hover">
          Find
        </button>
        {query.invoice && (
          <Link href={href({ invoice: null })} className="h-10 content-center text-sm font-semibold text-primary">
            Clear
          </Link>
        )}
      </form>
      <div className="space-y-3">
        <FilterChips label="Filter by status" current={query.status ?? null} href={(value) => href({ status: value })} options={[{ value: null, text: "All" }, ...PAYMENT_STATUSES.map((value) => ({ value, text: PAYMENT_STATUS_TEXT[value] as string }))]} />
        <FilterChips
          label="Filter by readiness"
          current={query.releasable ? "releasable" : query.disputed ? "disputed" : null}
          href={(value) => href({ releasable: value === "releasable", disputed: value === "disputed" })}
          options={[{ value: null, text: "Any" }, { value: "releasable", text: "Ready to release" }, { value: "disputed", text: "Disputed" }]}
        />
      </div>

      {page.items.length === 0 ? (
        <Empty>No payments match.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead>
              <tr className="bg-surface-alt text-[11px] font-semibold uppercase tracking-wider text-muted">
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Brand → creator</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Fee / creator net</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {page.items.map((payment) => (
                <tr key={payment.id} className="hover:bg-surface-alt/70">
                  <td className="px-4 py-3.5">
                    <Link href={`${BASE}/${payment.id}`} className="font-semibold text-heading hover:text-primary">
                      {payment.reference}
                    </Link>
                    <span className="block text-xs text-muted">
                      {payment.engagement.campaign?.title ?? "Direct hire"} · {dateTime(payment.fundedAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-body">
                    {payment.brand.name} → {payment.creator.displayName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold tabular-nums text-heading">{formatFcfa(payment.amountXaf)}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-body">
                    {formatFcfa(payment.feeXaf)} / {formatFcfa(payment.netXaf)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <Pill tone={TONE[payment.status as keyof typeof TONE] ?? "neutral"}>{label(PAYMENT_STATUS_TEXT, payment.status)}</Pill>
                      {payment.dispute && payment.dispute.status === "open" && <Pill tone="bad">Disputed</Pill>}
                      {payment.actions.canRelease && <Pill tone="good">Ready to release</Pill>}
                      {payment.simulated && <Pill tone="warn">Simulated</Pill>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {page.nextCursor && <MoreLink href={href({ cursor: page.nextCursor })} />}
    </div>
  );
}
