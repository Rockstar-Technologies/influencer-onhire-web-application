import Link from "next/link";
import { CAMPAIGNS_PATH, loadCampaign } from "@/features/brand-campaigns/server";
import { formatDate } from "@/lib/format";
import { campaignDays } from "@/features/brand-campaigns/mapping";
import { formatPrice } from "@/lib/utils";
import { CampaignActions } from "./campaign-actions";
import { CampaignStatusBadge } from "./campaign-status";

const STATUS_NOTE: Record<string, string> = {
  draft: "This draft is private to you. Edit it, then submit it for review when you are ready.",
  pending_review: "Waiting for our team to review it. You can't edit it while it is under review; you can withdraw it.",
  open: "Approved and open. Matching creators can respond.",
  accepted: "A creator has accepted this campaign.",
  in_progress: "This campaign is in progress.",
  completed: "This campaign is complete.",
  rejected: "This campaign was not approved. It can't be edited or resubmitted; create a new campaign to try again.",
  cancelled: "This campaign was cancelled.",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-heading sm:max-w-[28rem] sm:text-right">{children}</dd>
    </div>
  );
}

const names = (items: { name?: string; label?: string }[]) => (items.length ? items.map((item) => item.name ?? item.label).join(", ") : "Not specified");

/** One of the brand's own campaigns, exactly as the API holds it, with the actions its current status allows. */
export async function CampaignDetailPage({ id, justSubmitted }: { id: string; justSubmitted: boolean }) {
  const campaign = await loadCampaign(id, `${CAMPAIGNS_PATH}/${id}`);
  const days = campaignDays(campaign.startDate, campaign.endDate);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={CAMPAIGNS_PATH} className="text-sm font-medium text-primary hover:text-primary-hover">
        ← My campaigns
      </Link>

      {justSubmitted && campaign.status === "pending_review" && (
        <div role="status" className="rounded-2xl bg-success-light px-5 py-4 text-sm text-success-strong">
          <p className="font-semibold">Your campaign was submitted for review.</p>
          <p className="mt-1 text-body">Our team will review it. Its status is shown below and updates here once it has been reviewed.</p>
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-extrabold text-heading sm:text-3xl">{campaign.title}</h1>
          <CampaignStatusBadge status={campaign.status} />
        </div>
        <p className="mt-1 text-sm text-muted">{campaign.reference}</p>
        <p className="mt-3 text-sm text-body">{STATUS_NOTE[campaign.status] ?? ""}</p>
      </div>

      {campaign.reviewNote && (
        <section role="note" aria-label="Reviewer's note" className="rounded-2xl border border-border bg-surface px-5 py-4">
          <h2 className="text-sm font-bold text-heading">Note from our team</h2>
          <p className="mt-1.5 text-sm text-body">{campaign.reviewNote}</p>
          {campaign.reviewedAt && <p className="mt-2 text-xs text-muted">Reviewed {formatDate(campaign.reviewedAt)}</p>}
        </section>
      )}

      <dl className="divide-y divide-border-light overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <Row label="Niche">{campaign.niche.name}</Row>
        <Row label="Maximum budget per creator">{formatPrice(campaign.budgetXaf)}</Row>
        <Row label="Schedule">
          {formatDate(campaign.startDate)} → {formatDate(campaign.endDate)}
          {days ? ` (${days} ${days === 1 ? "day" : "days"})` : ""}
        </Row>
        <Row label="Expectations">{campaign.deliverables}</Row>
        <Row label="Minimum engagement">{campaign.minEngagement ? campaign.minEngagement.label : "No minimum"}</Row>
        <Row label="Locations">{names(campaign.cities)}</Row>
        <Row label="Age ranges">{names(campaign.ageRanges)}</Row>
        <Row label="Interests">{names(campaign.interests)}</Row>
        <Row label="Created">{formatDate(campaign.createdAt)}</Row>
        {campaign.submittedAt && <Row label="Submitted">{formatDate(campaign.submittedAt)}</Row>}
        {campaign.cancelledAt && <Row label="Cancelled">{formatDate(campaign.cancelledAt)}</Row>}
      </dl>

      <CampaignActions id={campaign.id} status={campaign.status} />
    </div>
  );
}
