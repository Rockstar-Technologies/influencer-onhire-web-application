import Link from "next/link";
import { EscrowBadge } from "@/components/shared/escrow-badge";
import { EscrowSteps } from "@/components/shared/escrow-steps";
import { loadBrandPayments, PAYMENTS_PATH } from "@/features/funding/server";
import { PAYMENT_STATUS } from "@/lib/domain/vocabulary";
import { formatDate, formatFcfa } from "@/lib/format";

/** The brand's own payments, as the API holds them (it only ever returns this brand's rows). The fee and the creator's net are never shown to a brand. */
export async function BrandPaymentsPage({ cursor }: { cursor?: string }) {
  const page = await loadBrandPayments({ ...(cursor ? { cursor } : {}) });
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
    </div>
  );
}
