import { StatusBadge, type BadgeStyle } from "@/components/shared/status-badge";
import { formatRelativeTimeInline } from "@/lib/utils";
import type { Dispute, DisputeStatus } from "@/types/user-management";

const DISPUTE_STYLES: Record<DisputeStatus, BadgeStyle> = {
  open: { label: "Open", badge: "bg-warning-light text-warning", dot: "bg-warning" },
  "resolved-in-favour": { label: "Won", badge: "bg-success-light text-success-strong", dot: "bg-success" },
  "resolved-against": { label: "Lost", badge: "bg-danger-light text-danger-strong", dot: "bg-danger" },
};

export function DisputesPanel({ disputes }: { disputes: Dispute[] }) {
  return (
    <section aria-labelledby="disputes-heading" className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 id="disputes-heading" className="font-display text-base font-bold text-heading">
        Dispute History
      </h2>
      {disputes.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No disputes on record.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {disputes.map((dispute) => (
            <li key={dispute.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-heading">{dispute.campaign}</p>
                <p className="mt-0.5 text-sm text-body">{dispute.reason}</p>
                <p className="mt-0.5 text-xs text-muted">
                  Opened <time dateTime={dispute.openedAt}>{formatRelativeTimeInline(dispute.openedAt)}</time>
                </p>
              </div>
              <StatusBadge {...DISPUTE_STYLES[dispute.status]} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
