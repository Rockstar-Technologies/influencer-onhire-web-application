import Link from "next/link";
import { BRAND_OFFERS_PATH, loadBrandOffers } from "../server";
import { OFFER_STATUS_LABELS } from "@/lib/domain/labels";
import { OFFER_STATUS } from "@/lib/domain/vocabulary";
import { formatDate, formatFcfa } from "@/lib/format";
import { cn } from "@/lib/utils";
import { hireAnswerBy, offerKind } from "../mapping";
import { BRAND_OFFER_KIND_LABELS, OfferStatusBadge } from "../offer-status";
import { BrandOfferActions } from "./brand-offer-actions";
import { fundingMessage } from "@/features/funding/mapping";
import { fundPath, loadFundingStates } from "@/features/funding/server";

/** The signed-in brand's side of offers: the hires it sent and the applications and invitations on its campaigns. The API only returns this brand's rows. */
export async function BrandOffersPage({ status, cursor }: { status?: string; cursor?: string }) {
  const page = await loadBrandOffers({ ...(status ? { status } : {}), ...(cursor ? { cursor } : {}) });
  // Accepted bookings are paid for: show where each payment stands, as the API reports it (an unreadable state simply shows no badge).
  const funding = await loadFundingStates(page.items.filter((offer) => offer.status === "accepted").map((offer) => offer.id));
  const href = (next: { status?: string | null; cursor?: string | null }) => {
    const query = new URLSearchParams();
    if (next.status) query.set("status", next.status);
    if (next.cursor) query.set("cursor", next.cursor);
    const text = query.toString();
    return text ? `${BRAND_OFFERS_PATH}?${text}` : BRAND_OFFERS_PATH;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-heading sm:text-3xl">My hires</h1>
          <p className="mt-2 text-sm text-body">Hire requests you sent to creators, and creators who applied to your campaigns.</p>
        </div>
        <Link href="/influencers" className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
          Find influencers
        </Link>
      </div>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {[null, ...OFFER_STATUS.values].map((value) => (
          <Link
            key={value ?? "all"}
            href={href({ status: value })}
            aria-current={page.status === value ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              page.status === value ? "border-primary bg-primary text-white" : "border-border bg-surface text-body hover:border-primary-border hover:text-primary",
            )}
          >
            {value ? OFFER_STATUS_LABELS[value] : "All"}
          </Link>
        ))}
      </nav>

      {page.items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center">
          <p className="font-semibold text-heading">{page.status ? "No requests with this status." : "You haven't hired anyone yet."}</p>
          <p className="mt-1 text-sm text-body">Find a creator and send a hire request, or open a campaign for creators to join.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {page.items.map((offer) => {
            const kind = offerKind(offer);
            const answerBy = hireAnswerBy(offer);
            return (
              <li key={offer.id} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">{BRAND_OFFER_KIND_LABELS[kind]}</p>
                    <h2 className="mt-1 text-base font-bold text-heading">
                      {offer.creator?.displayName ?? "Creator"}
                      {offer.campaign ? ` · ${offer.campaign.title}` : ""}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted">
                      {offer.reference}
                      {offer.creator?.city ? ` · ${offer.creator.city}` : ""}
                      {offer.platform ? ` · ${offer.platform.name}` : ""}
                    </p>
                  </div>
                  <OfferStatusBadge status={offer.status} />
                </div>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted">Price</dt>
                    <dd className="font-semibold tabular-nums text-heading">{formatFcfa(offer.priceXaf)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Sent</dt>
                    <dd className="text-heading">{formatDate(offer.createdAt)}</dd>
                  </div>
                  {offer.window && (
                    <div>
                      <dt className="text-muted">Booking dates</dt>
                      <dd className="text-heading">
                        {formatDate(offer.window.startDate)} → {formatDate(offer.window.endDate)}
                      </dd>
                    </div>
                  )}
                  {kind === "direct_hire" && offer.hire?.durationLabel && (
                    <div>
                      <dt className="text-muted">Duration</dt>
                      <dd className="text-heading">{offer.hire.durationLabel}</dd>
                    </div>
                  )}
                  {kind === "direct_hire" && offer.hire && (
                    <div>
                      <dt className="text-muted">Payment method</dt>
                      <dd className="text-heading">{offer.hire.paymentMethod.name}</dd>
                    </div>
                  )}
                  {answerBy && (
                    <div>
                      <dt className="text-muted">Expires</dt>
                      <dd className="text-heading">{formatDate(answerBy.toISOString())}</dd>
                    </div>
                  )}
                  {offer.status === "accepted" && offer.fundingDeadline && (
                    <div>
                      <dt className="text-muted">Fund by</dt>
                      <dd className="text-heading">{formatDate(offer.fundingDeadline)}</dd>
                    </div>
                  )}
                </dl>
                {kind === "application" && offer.pitch && (
                  <p className="mt-3 text-sm text-body">
                    <span className="font-medium text-heading">Their pitch:</span> {offer.pitch}
                  </p>
                )}

                {offer.status === "accepted" && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-surface-alt px-4 py-3 text-sm">
                    <span data-testid="funding-state" className="font-semibold text-heading">
                      {funding.get(offer.id) ? fundingMessage(funding.get(offer.id)!).title : "Payment"}
                    </span>
                    {funding.get(offer.id)?.simulated && <span className="rounded-full bg-warning-light px-2 py-0.5 text-[11px] font-semibold text-warning">Simulated</span>}
                    <Link href={fundPath(offer.id)} className="ml-auto rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover">
                      {funding.get(offer.id)?.status === "funded" ? "View payment" : "Pay for this booking"}
                    </Link>
                  </div>
                )}

                <BrandOfferActions id={offer.id} status={offer.status} kind={kind} />
              </li>
            );
          })}
        </ul>
      )}

      {page.nextCursor && (
        <div className="text-center">
          <Link href={href({ status: page.status, cursor: page.nextCursor })} className="inline-flex rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-heading hover:bg-surface-alt">
            Show more
          </Link>
        </div>
      )}
    </div>
  );
}
