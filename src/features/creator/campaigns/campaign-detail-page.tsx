import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { offerKind } from "@/features/offers/mapping";
import { OfferStatusBadge } from "@/features/offers/offer-status";
import { formatDate, formatFcfa } from "@/lib/format";
import { ApplyForm } from "./apply-form";
import { loadCampaign, loadMyOffer, loadMyPlatforms } from "./server";
import { WithdrawButton } from "./withdraw-button";

/** One open campaign with everything the creator needs to decide, and either the application form or the state of their own application. */
export async function CampaignDetailPage({ id }: { id: string }) {
  const campaign = await loadCampaign(id);
  const returnTo = `/creator/campaigns/${campaign.id}`;
  const platforms = campaign.eligibility.canApply && !campaign.myOffer ? await loadMyPlatforms(returnTo) : [];
  const mine = campaign.myOffer ? await loadMyOffer(campaign.myOffer.id, returnTo) : null;
  const invited = mine ? offerKind(mine) === "invitation" : false;
  const facts: [string, string][] = [
    ["Brand", campaign.brand.name],
    ["Niche", campaign.niche.name],
    ["Maximum per creator", formatFcfa(campaign.budgetXaf)],
    ["Dates", `${formatDate(campaign.startDate)} → ${formatDate(campaign.endDate)}`],
    ["Minimum engagement", campaign.minEngagement?.label ?? "None"],
    ["Cities", campaign.cities.map((c) => c.name).join(", ") || "Any"],
    ...(campaign.interests.length ? ([["Audience interests", campaign.interests.map((i) => i.name).join(", ")]] as [string, string][]) : []),
    ...(campaign.ageRanges.length ? ([["Audience ages", campaign.ageRanges.map((a) => a.label).join(", ")]] as [string, string][]) : []),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/creator/campaigns" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover">
        <FiArrowLeft aria-hidden />
        Back to campaigns
      </Link>
      <div>
        <h1 className="font-display text-2xl font-extrabold text-heading sm:text-3xl">{campaign.title}</h1>
        <p className="mt-1 text-sm text-muted">{campaign.reference}</p>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-2">
          {facts.map(([name, value]) => (
            <div key={name}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{name}</dt>
              <dd className="mt-1 text-sm font-medium text-heading">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 whitespace-pre-line text-sm text-body">
          <span className="font-semibold text-heading">What the brand expects: </span>
          {campaign.deliverables}
        </p>
        <p className="mt-3 text-xs text-muted">The budget is the most the brand will pay each creator, not a total shared between creators. If you are accepted you are booked for the campaign&apos;s dates.</p>
      </section>

      {campaign.myOffer ? (
        <section className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-sm" aria-label={invited ? "Your invitation" : "Your application"}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold text-heading">{invited ? "You were invited to this campaign" : "Your application"}</h2>
            <OfferStatusBadge status={campaign.myOffer.status} />
          </div>
          <p className="text-sm text-body">
            {invited
              ? campaign.myOffer.status === "pending"
                ? "The platform matched you with this campaign. Accept or decline the invitation in your requests; you don't need to apply."
                : campaign.myOffer.status === "accepted"
                  ? "You accepted this invitation. See it in your requests."
                  : "This invitation is closed. You can't apply to this campaign."
              : campaign.myOffer.status === "pending"
                ? "Waiting for the brand's decision. You can withdraw it while it is pending."
                : campaign.myOffer.status === "accepted"
                  ? "The brand accepted your application. See it in your requests."
                  : "This application is closed. You can't apply to this campaign again."}
          </p>
          {!invited && campaign.myOffer.status === "pending" && <WithdrawButton offerId={campaign.myOffer.id} returnTo={returnTo} />}
          <Link href="/creator/requests" className="inline-flex text-sm font-semibold text-primary hover:text-primary-hover">
            {invited && campaign.myOffer.status === "pending" ? "Answer the invitation" : "Go to my requests"}
          </Link>
        </section>
      ) : campaign.eligibility.canApply ? (
        <ApplyForm campaignId={campaign.id} budgetXaf={campaign.budgetXaf} platforms={platforms} />
      ) : (
        <p className="rounded-2xl border border-border bg-surface px-5 py-4 text-sm text-body" role="note">
          {campaign.eligibility.meetsMinEngagement ? "You can't apply to this campaign right now." : "Your engagement rate is below this campaign's minimum (or you haven't shared one), so you can't apply."}
        </p>
      )}
    </div>
  );
}
