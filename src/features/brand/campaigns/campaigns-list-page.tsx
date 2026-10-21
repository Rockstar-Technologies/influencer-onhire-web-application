import Link from "next/link";
import { CAMPAIGNS_PATH, NEW_CAMPAIGN_PATH, loadCampaigns } from "@/features/brand-campaigns/server";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/domain/labels";
import { CAMPAIGN_STATUS } from "@/lib/domain/vocabulary";
import { cn, formatPrice } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { CampaignStatusBadge } from "./campaign-status";

/** The signed-in brand's own campaigns, with their real statuses (the API only ever returns this brand's rows). */
export async function CampaignsListPage({ status, cursor }: { status?: string; cursor?: string }) {
  const page = await loadCampaigns({ ...(status ? { status } : {}), ...(cursor ? { cursor } : {}) });
  const href = (next: { status?: string | null; cursor?: string | null }) => {
    const query = new URLSearchParams();
    if (next.status) query.set("status", next.status);
    if (next.cursor) query.set("cursor", next.cursor);
    const text = query.toString();
    return text ? `${CAMPAIGNS_PATH}?${text}` : CAMPAIGNS_PATH;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-heading sm:text-3xl">My campaigns</h1>
          <p className="mt-2 text-sm text-body">Drafts, campaigns waiting for review, and the ones that are open to creators.</p>
        </div>
        <Link href={NEW_CAMPAIGN_PATH} className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
          New campaign
        </Link>
      </div>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {[null, ...CAMPAIGN_STATUS.values].map((value) => (
          <Link
            key={value ?? "all"}
            href={href({ status: value })}
            aria-current={page.status === value ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              page.status === value ? "border-primary bg-primary text-white" : "border-border bg-surface text-body hover:border-primary-border hover:text-primary",
            )}
          >
            {value ? CAMPAIGN_STATUS_LABELS[value] : "All"}
          </Link>
        ))}
      </nav>

      {page.items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center">
          <p className="font-semibold text-heading">{page.status ? "No campaigns with this status." : "You haven't created a campaign yet."}</p>
          <p className="mt-1 text-sm text-body">Start with a draft: you can save it and come back before submitting it for review.</p>
          <Link href={NEW_CAMPAIGN_PATH} className="mt-4 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
            Create a campaign
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead>
              <tr className="bg-surface-alt text-[11px] font-semibold uppercase tracking-wider text-muted">
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Maximum budget</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {page.items.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-surface-alt/70">
                  <td className="px-4 py-4">
                    <Link href={`${CAMPAIGNS_PATH}/${campaign.id}`} className="font-semibold text-heading hover:text-primary">
                      {campaign.title}
                    </Link>
                    <span className="mt-0.5 block text-xs text-muted">
                      {campaign.reference} · {campaign.niche.name}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold tabular-nums text-heading">{formatPrice(campaign.budgetXaf)}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-body">
                    {formatDate(campaign.startDate)} → {formatDate(campaign.endDate)}
                  </td>
                  <td className="px-4 py-4">
                    <CampaignStatusBadge status={campaign.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-body">{formatDate(campaign.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
