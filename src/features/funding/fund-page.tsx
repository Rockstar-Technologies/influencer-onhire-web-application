import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { formatFcfa } from "@/lib/format";
import { offerKind } from "@/features/offers/mapping";
import { FundPanel } from "./fund-panel";
import { loadFundable } from "./server";

/** The payment page for one of the brand's accepted bookings. Everything on it comes from the API; another brand's offer is "not found". */
export async function FundPage({ offerId }: { offerId: string }) {
  const { offer, funding } = await loadFundable(offerId);
  const kind = offerKind(offer);
  const who = offer.creator?.displayName ?? "the creator";
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/brand/offers" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover">
        <FiArrowLeft aria-hidden />
        Back to my hires
      </Link>
      <div>
        <h1 className="font-display text-2xl font-extrabold text-heading sm:text-3xl">Pay for this booking</h1>
        <p className="mt-2 text-sm text-body">
          {kind === "direct_hire" ? `Hire of ${who}` : `${offer.campaign?.title ?? "Campaign"} · ${who}`} · {offer.reference}
          {offer.platform ? ` · ${offer.platform.name}` : ""} · {formatFcfa(offer.priceXaf)}
        </p>
      </div>
      <FundPanel offerId={offer.id} initial={funding} preferredMethod={offer.hire?.paymentMethod.code ?? null} />
    </div>
  );
}
