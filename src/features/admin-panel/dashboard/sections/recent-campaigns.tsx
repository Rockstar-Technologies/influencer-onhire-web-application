import { StatusBadge, type BadgeStyle } from "@/components/shared/status-badge";
import { cn, formatPrice } from "@/lib/utils";
import { listRecentCampaigns } from "@/services/dashboard.service";
import type { CampaignStatus } from "@/types/dashboard";

// Green = done/paid, amber = waiting on someone, red = late, blue = scheduled or running, grey = draft.
const STATUS_STYLES: Record<CampaignStatus, BadgeStyle> = {
  completed: { label: "Completed", badge: "bg-success-light text-success-strong", dot: "bg-success" },
  "pending-review": { label: "Pending Review", badge: "bg-warning-light text-warning", dot: "bg-warning" },
  overdue: { label: "Overdue", badge: "bg-danger-light text-danger-strong", dot: "bg-danger" },
  "in-progress": { label: "In Progress", badge: "bg-info-light text-info", dot: "bg-info" },
  scheduled: { label: "Scheduled", badge: "bg-info-light text-info", dot: "bg-info" },
  draft: { label: "Draft", badge: "bg-border-light text-body", dot: "bg-muted" },
};

const COLUMNS = ["Campaign", "Budget", "Delivery", "Due", "Status"];

function dueLabel(iso: string) {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60_000));
  if (days === 0) return "Today";
  if (days > 0) return `In ${days} ${days === 1 ? "day" : "days"}`;
  return `${-days} ${days === -1 ? "day" : "days"} ago`;
}

export async function RecentCampaigns() {
  const campaigns = await listRecentCampaigns();

  return (
    <section aria-labelledby="campaigns-heading" className="h-full min-w-0 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="campaigns-heading" className="font-display text-base font-bold text-heading">
          Recent Campaigns
        </h2>
        <span className="rounded-full bg-border-light px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted">
          Full list soon
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {COLUMNS.map((column) => (
                <th key={column} scope="col" className="px-3 pb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {campaigns.map((campaign) => {
              const percent = Math.round((campaign.delivered / campaign.influencers) * 100);
              return (
                <tr key={campaign.id} className="transition-colors hover:bg-surface-alt">
                  <td className="px-3 py-3.5">
                    <span className="block font-semibold text-heading">{campaign.name}</span>
                    <span className="block text-xs text-muted">{campaign.brand}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-heading">{formatPrice(campaign.budget)}</td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-1.5 w-20 overflow-hidden rounded-full bg-border-light"
                        role="progressbar"
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${campaign.delivered} of ${campaign.influencers} deliverables in`}
                      >
                        <div
                          className={cn(
                            "h-full rounded-full",
                            campaign.status === "completed" ? "bg-success" : campaign.status === "overdue" ? "bg-danger" : "bg-navy",
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="whitespace-nowrap text-xs text-body">
                        {campaign.delivered}/{campaign.influencers}
                      </span>
                    </div>
                  </td>
                  <td className={cn("whitespace-nowrap px-3 py-3.5", campaign.status === "overdue" ? "font-semibold text-danger-strong" : "text-body")}>
                    <time dateTime={campaign.endsAt}>{dueLabel(campaign.endsAt)}</time>
                  </td>
                  <td className="px-3 py-3.5">
                    <StatusBadge {...STATUS_STYLES[campaign.status]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
