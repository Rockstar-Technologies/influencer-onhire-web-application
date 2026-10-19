import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import type { PermissionCode } from "@/lib/domain/vocabulary";
import { formatDate, formatFcfa } from "@/lib/format";
import { CampaignDecision } from "./decisions";
import { REVIEW_CAMPAIGN_STATUS_TEXT, dateTime, label } from "./mapping";
import { loadReviewCampaign } from "./server";
import { AdminHeader, Card, Facts, Pill } from "./ui";

/** A submitted campaign in full (drafts are never visible to staff). */
export async function CampaignDetailPage({ id, viewer }: { id: string; viewer: { permissions: readonly PermissionCode[] } }) {
  const campaign = await loadReviewCampaign(id);
  const canDecide = viewer.permissions.includes("campaigns.review") && campaign.status === "pending_review";
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/admin/campaigns" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover">
        <FiArrowLeft aria-hidden />
        Back to campaign review
      </Link>
      <AdminHeader title={campaign.title} text={`${campaign.reference} · ${campaign.brand.name}`} action={<Pill tone={campaign.status === "pending_review" ? "wait" : campaign.status === "rejected" || campaign.status === "cancelled" ? "bad" : "good"}>{label(REVIEW_CAMPAIGN_STATUS_TEXT, campaign.status)}</Pill>} />
      <Card title="Brief">
        <Facts
          items={[
            ["Niche", campaign.niche.name],
            ["Maximum budget per creator", formatFcfa(campaign.budgetXaf)],
            ["Dates", `${formatDate(campaign.startDate)} → ${formatDate(campaign.endDate)}`],
            ["Minimum engagement", campaign.minEngagement?.label ?? "No minimum"],
            ["Cities", campaign.cities.map((c) => c.name).join(", ") || "Any"],
            ["Interests", campaign.interests.map((i) => i.name).join(", ") || "—"],
            ["Age ranges", campaign.ageRanges.map((a) => a.label).join(", ") || "—"],
            ["Submitted", dateTime(campaign.submittedAt)],
            ["Reviewed", dateTime(campaign.reviewedAt)],
          ]}
        />
        <p className="mt-4 whitespace-pre-line text-sm text-body">
          <span className="font-semibold text-heading">Expectations: </span>
          {campaign.deliverables}
        </p>
        {campaign.reviewNote && (
          <p className="mt-4 rounded-lg bg-surface-alt px-4 py-3 text-sm text-body">
            <span className="font-semibold text-heading">Review note:</span> {campaign.reviewNote}
          </p>
        )}
      </Card>
      <Card title="Decision">
        {viewer.permissions.includes("campaigns.review") ? <CampaignDecision id={campaign.id} canDecide={canDecide} /> : <p className="text-sm text-muted">Your role can’t decide campaigns.</p>}
      </Card>
    </div>
  );
}
