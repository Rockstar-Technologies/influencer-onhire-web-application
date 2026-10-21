import { OfferStatusBadge, OFFER_KIND_LABELS } from "@/features/offers/offer-status";
import { offerKind } from "@/features/offers/mapping";
import type { OfferView } from "@/lib/api/schemas";
import { cn } from "@/lib/utils";
import { formatDate, formatFcfa } from "@/lib/format";

/** Every answered or closed offer with the API's own status (a withdrawn, cancelled or expired request is never shown as "Declined"). */
export function RequestHistory({ offers, highlightId }: { offers: OfferView[]; highlightId?: string | null }) {
  return (
    <section className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-bold text-heading">Request History</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead>
            <tr className="bg-surface-alt text-[11px] font-semibold uppercase tracking-wider text-muted [&>th:first-child]:rounded-l-lg [&>th:last-child]:rounded-r-lg">
              <th className="px-4 py-3 font-semibold">Request</th>
              <th className="px-4 py-3 font-semibold">Brand</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Dates</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {offers.map((offer) => {
              const kind = offerKind(offer);
              return (
                <tr key={offer.id} className={cn("transition-colors hover:bg-surface-alt/70", highlightId === offer.id && "bg-primary-light/60 hover:bg-primary-light/60")}>
                  <td className="px-4 py-4">
                    <span className="font-medium text-heading">{offer.campaign?.title ?? `Hire request ${offer.reference}`}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {OFFER_KIND_LABELS[kind]} · {offer.reference}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-body">{offer.brandName ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold tabular-nums text-heading">{formatFcfa(offer.priceXaf)}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-body">
                    {offer.window ? `${formatDate(offer.window.startDate)} → ${formatDate(offer.window.endDate)}` : formatDate(offer.respondedAt ?? offer.createdAt)}
                  </td>
                  <td className="px-4 py-4">
                    <OfferStatusBadge status={offer.status} />
                    {offer.status === "accepted" && offer.fundingDeadline && <span className="mt-1 block text-xs text-muted">Funding due by {formatDate(offer.fundingDeadline)}</span>}
                  </td>
                </tr>
              );
            })}
            {offers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-body">
                  No past requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
