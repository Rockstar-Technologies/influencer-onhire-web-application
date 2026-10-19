import { cn } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS, formatDate, formatFcfa } from "@/lib/format";
import type { Withdrawal } from "@/types/earnings";
import { lookupOr } from "@/lib/domain/labels";

const UNKNOWN_STATUS = { label: "Unknown", className: "bg-border-light text-body" };

const STATUS_STYLES: Record<Withdrawal["status"], { label: string; className: string }> = {
  completed: { label: "Completed", className: "bg-success/10 text-success" },
  processing: { label: "Processing", className: "bg-warning/10 text-warning" },
  requested: { label: "Requested", className: "bg-warning/10 text-warning" },
  under_review: { label: "Under review", className: "bg-warning/10 text-warning" },
  approved: { label: "Approved", className: "bg-info-light text-info" },
  rejected: { label: "Rejected", className: "bg-danger-light text-danger-strong" },
  cancelled: { label: "Cancelled", className: "bg-border-light text-body" },
  failed: { label: "Failed", className: "bg-danger-light text-danger-strong" },
};

export function WithdrawalHistory({ withdrawals, highlightId }: { withdrawals: Withdrawal[]; highlightId?: string | null }) {
  return (
    <section className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-bold text-heading">Withdrawal History</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="bg-surface-alt text-[11px] font-semibold uppercase tracking-wider text-muted [&>th:first-child]:rounded-l-lg [&>th:last-child]:rounded-r-lg">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Withdrawn To</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {withdrawals.map((withdrawal) => {
              const status = lookupOr(STATUS_STYLES, withdrawal.status, UNKNOWN_STATUS);
              return (
                <tr
                  key={withdrawal.id}
                  className={cn(
                    "transition-colors hover:bg-surface-alt/70",
                    highlightId === withdrawal.id && "bg-primary-light/60 hover:bg-primary-light/60"
                  )}
                >
                  <td className="whitespace-nowrap px-4 py-4 text-body">{formatDate(withdrawal.date)}</td>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold tabular-nums text-heading">
                    {formatFcfa(withdrawal.amount)}
                  </td>
                  <td className="px-4 py-4 text-body">
                    {PAYMENT_METHOD_LABELS[withdrawal.method]}
                    <span className="ml-1.5 text-xs text-muted">· {withdrawal.phone}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", status.className)}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {withdrawals.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-body">
                  No withdrawals yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
