import Link from "next/link";
import { formatFcfa } from "@/lib/format";
import { CAMPAIGN_REVIEW_STATUSES, loadReviewCampaigns } from "./server";
import type { CampaignReviewQuery } from "./server";
import { REVIEW_CAMPAIGN_STATUS_TEXT, dateTime, label } from "./mapping";
import { AdminHeader, Empty, FilterChips, MoreLink, Pill, queryHref } from "./ui";

const BASE = "/admin/campaigns";

/** The campaign review queue (oldest submission first) and the campaigns already decided, from the API. */
export async function CampaignsReviewPage({ query }: { query: CampaignReviewQuery }) {
  const page = await loadReviewCampaigns(query);
  const href = (change: Partial<Record<keyof CampaignReviewQuery, string | null>>) => queryHref(BASE, { q: query.q, status: query.status === "pending_review" ? null : query.status, ...change });
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminHeader title="Campaign review" text="Campaigns that brands submitted come first, oldest first. Open one to read it and approve or reject it." />
      <form action={BASE} role="search" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="min-w-0 flex-1">
          <label htmlFor="cmp-q" className="text-xs font-semibold uppercase tracking-wide text-muted">
            Campaign title
          </label>
          <input id="cmp-q" name="q" defaultValue={query.q ?? ""} minLength={2} maxLength={100} className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-heading outline-none focus:border-primary" />
        </div>
        {query.status !== "pending_review" && <input type="hidden" name="status" value={query.status} />}
        <button type="submit" className="h-10 rounded-lg bg-navy px-5 text-sm font-semibold text-white hover:bg-navy-hover">
          Search
        </button>
      </form>
      <FilterChips label="Filter by status" current={query.status} href={(value) => href({ status: value })} options={CAMPAIGN_REVIEW_STATUSES.map((value) => ({ value, text: REVIEW_CAMPAIGN_STATUS_TEXT[value] as string }))} />

      {page.items.length === 0 ? (
        <Empty>{query.status === "pending_review" ? "No campaigns are waiting for review." : "No campaigns with this status."}</Empty>
      ) : (
        <ul className="space-y-3">
          {page.items.map((campaign) => (
            <li key={campaign.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <div className="min-w-0">
                <Link href={`${BASE}/${campaign.id}`} className="font-semibold text-heading hover:text-primary">
                  {campaign.title}
                </Link>
                <p className="text-xs text-muted">
                  {campaign.reference} · {campaign.brand.name} · {campaign.niche.name} · up to {formatFcfa(campaign.budgetXaf)} per creator
                </p>
                <p className="mt-1 text-xs text-muted">Submitted {dateTime(campaign.submittedAt)}</p>
              </div>
              <Pill tone={campaign.status === "pending_review" ? "wait" : campaign.status === "rejected" || campaign.status === "cancelled" ? "bad" : "good"}>{label(REVIEW_CAMPAIGN_STATUS_TEXT, campaign.status)}</Pill>
            </li>
          ))}
        </ul>
      )}
      {page.nextCursor && <MoreLink href={href({ cursor: page.nextCursor })} />}
    </div>
  );
}
