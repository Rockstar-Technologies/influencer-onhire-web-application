import { OFFER_STATUS_LABELS, lookupOr } from "@/lib/domain/labels";
import { cn } from "@/lib/utils";
import type { CampaignRequest } from "@/types/campaign-request";
import { formatDate, formatFcfa } from "../request-format";

const NEUTRAL = "bg-heading/5 text-body";

/** One entry per API offer status, so a withdrawn or expired request is never shown as "Declined". */
const RESPONSE_STYLES: Record<CampaignRequest["status"], { label: string; className: string }> = {
  accepted: { label: OFFER_STATUS_LABELS.accepted, className: "bg-success/10 text-success" },
  declined: { label: OFFER_STATUS_LABELS.declined, className: NEUTRAL },
  pending: { label: OFFER_STATUS_LABELS.pending, className: "bg-warning/10 text-warning" },
  withdrawn: { label: OFFER_STATUS_LABELS.withdrawn, className: NEUTRAL },
  cancelled: { label: OFFER_STATUS_LABELS.cancelled, className: NEUTRAL },
  expired: { label: OFFER_STATUS_LABELS.expired, className: NEUTRAL },
  funding_expired: { label: OFFER_STATUS_LABELS.funding_expired, className: NEUTRAL },
  refunded: { label: OFFER_STATUS_LABELS.refunded, className: NEUTRAL },
};

const UNKNOWN_RESPONSE = { label: "Unknown", className: NEUTRAL };

export function RequestHistory({ requests, highlightId }: { requests: CampaignRequest[]; highlightId?: string | null }) {
  return (
    <section className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-bold text-heading">Request History</h2>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead>
            <tr className="bg-surface-alt text-[11px] font-semibold uppercase tracking-wider text-muted [&>th:first-child]:rounded-l-lg [&>th:last-child]:rounded-r-lg">
              <th className="px-4 py-3 font-semibold">Campaign</th>
              <th className="px-4 py-3 font-semibold">Brand</th>
              <th className="px-4 py-3 font-semibold">Budget</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Response</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {requests.map((request) => {
              const response = lookupOr(RESPONSE_STYLES, request.status, UNKNOWN_RESPONSE);
              return (
                <tr
                  key={request.id}
                  className={cn(
                    "transition-colors hover:bg-surface-alt/70",
                    highlightId === request.id && "bg-primary-light/60 hover:bg-primary-light/60"
                  )}
                >
                  <td className="px-4 py-4 font-medium text-heading">{request.campaignTitle}</td>
                  <td className="px-4 py-4 text-body">{request.brandName}</td>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold tabular-nums text-heading">
                    {formatFcfa(request.budget)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-body">
                    {formatDate(request.respondedAt ?? request.receivedAt)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                        response.className
                      )}
                      title={request.declineReason ? `Reason: ${request.declineReason}` : undefined}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {response.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-body">
                  No past requests match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
