import Link from "next/link";
import { EscrowBadge } from "@/components/shared/escrow-badge";
import { EscrowSteps } from "@/components/shared/escrow-steps";
import { loadBrandPayments, PAYMENTS_PATH } from "@/features/funding/server";
import { DeliveryActions, RefundRequestActions } from "@/features/payments/brand-payment-actions";
import { brandDeliveryNote } from "@/features/payments/labels";
import { loadBrandRefundRequests } from "@/features/payments/server";
import { PAYMENT_STATUS } from "@/lib/domain/vocabulary";
import { formatDate, formatFcfa } from "@/lib/format";

/** The brand's own payments, as the API holds them (it only ever returns this brand's rows). The fee and the creator's net are never shown to a brand. */
export async function BrandPaymentsPage({ cursor }: { cursor?: string }) {
  const [page, refunds] = await Promise.all([loadBrandPayments({ ...(cursor ? { cursor } : {}) }), loadBrandRefundRequests(PAYMENTS_PATH)]);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-heading sm:text-3xl">Payments &amp; Escrow</h1>
          <p className="mt-2 text-sm text-body">Payments you made into escrow, and where each one stands.</p>
        </div>
        <Link href="/brand/offers" className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
          Pay for an accepted booking
        </Link>
      </div>

      <EscrowSteps
        steps={[
          { title: "You pay", body: "Once a creator accepts, pay the booking's full price with MTN MoMo or Orange Money." },
          { title: "Held in escrow", body: "Your payment is held. The creator is not paid until the work is delivered." },
          { title: "Released on delivery", body: "After the creator reports delivery and it is confirmed, the payment is released to them." },
        ]}
      />

      <section aria-labelledby="brand-payments-heading" className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 id="brand-payments-heading" className="font-display text-base font-bold text-heading">
          Your payments
        </h2>
        {page.items.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted">
            No payments yet. When a creator accepts your hire request, pay for the booking from{" "}
            <Link href="/brand/offers" className="font-semibold text-primary underline">
              My hires
            </Link>
            .
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted">
                  <th scope="col" className="px-3 pb-3">Booking</th>
                  <th scope="col" className="px-3 pb-3">Creator</th>
                  <th scope="col" className="px-3 pb-3 text-right">Amount held</th>
                  <th scope="col" className="px-3 pb-3">Paid on</th>
                  <th scope="col" className="px-3 pb-3">Escrow status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {page.items.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-3 py-3.5">
                      <span className="block font-semibold text-heading">{payment.engagement.campaign?.title ?? "Direct hire"}</span>
                      <span className="block text-xs text-muted">{payment.reference}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-heading">{payment.creator.displayName}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-right font-semibold tabular-nums text-heading">{formatFcfa(payment.amountXaf)}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-body">{formatDate(payment.fundedAt)}</td>
                    <td className="px-3 py-3.5">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {PAYMENT_STATUS.is(payment.status) ? <EscrowBadge status={payment.status} /> : <span className="text-body">Unknown</span>}
                        {payment.simulated && <span className="rounded-full bg-warning-light px-2 py-0.5 text-[11px] font-semibold text-warning">Simulated</span>}
                      </span>
                      {brandDeliveryNote(payment) && <span className="mt-1 block max-w-xs text-xs text-body">{brandDeliveryNote(payment)}</span>}
                      {payment.dispute?.status === "open" && <span className="mt-1 block text-xs font-semibold text-warning">Dispute open</span>}
                      <div className="mt-2 max-w-sm"><DeliveryActions payment={payment} /></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {page.nextCursor && (
          <div className="mt-4 text-center">
            <Link href={`${PAYMENTS_PATH}?cursor=${encodeURIComponent(page.nextCursor)}`} className="inline-flex rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-heading hover:bg-surface-alt">
              Show more
            </Link>
          </div>
        )}
      </section>

      <section aria-labelledby="refund-requests-heading" className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 id="refund-requests-heading" className="font-display text-base font-bold text-heading">Refund review requests</h2>
        <p className="mt-1 text-sm text-body">A request asks our team to review a refund. It is not a refund: no money has been returned by any request listed here.</p>
        {refunds.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No refund review requests.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {refunds.map((r) => (
              <li key={r.id} className="space-y-2 py-3">
                <p className="text-sm font-semibold text-heading">{r.reference} · <span className="capitalize">{r.status}</span></p>
                <p className="text-xs text-muted">Requested {formatDate(r.requestedAt)}</p>
                <p className="text-sm text-body">{r.reason}</p>
                <RefundRequestActions request={r} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
