import Link from "next/link";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { PermissionCode } from "@/lib/domain/vocabulary";
import { loadAttention, loadDiagnostics } from "./finance-server";
import { queueSize } from "./server";
import type { QueueSize } from "./server";
import { AdminHeader } from "./ui";

interface Queue {
  id: string;
  title: string;
  text: string;
  href: string;
  permission: PermissionCode;
  size: Promise<QueueSize | null>;
}

const sizeText = (size: QueueSize | null) => (size === null ? "—" : `${size.count}${size.more ? "+" : ""}`);

/**
 * What is waiting for this administrator. Account, application and campaign queues are counted from one page of the real lists; the payment queues come from
 * the API's own exact "what is waiting" report (`/admin/payments/attention`, `/admin/payments/diagnostics`). Only queues the administrator may open are
 * shown. A figure that can't be read is a dash, never a guess. There are no revenue or growth figures: no source for them exists.
 */
export async function OverviewPage({ permissions }: { permissions: readonly PermissionCode[] }) {
  const canSeePayments = permissions.includes("payments.view");
  const [attention, diagnostics] = canSeePayments ? await Promise.all([loadAttention("/admin"), loadDiagnostics()]) : [null, null];
  const exact = (count: number | undefined): Promise<QueueSize | null> => Promise.resolve(count === undefined ? null : { count, more: false });
  const queues: Queue[] = [
    { id: "applications.review", title: "Creator applications to review", text: "Submitted and waiting for a decision.", href: "/admin/applications", permission: "applications.review", size: queueSize(ENDPOINTS.adminApplications, { status: "under_review" }) },
    { id: "campaigns.review", title: "Campaigns to review", text: "Submitted by brands and waiting for a decision.", href: "/admin/campaigns", permission: "campaigns.review", size: queueSize(ENDPOINTS.adminCampaigns, { status: "pending_review" }) },
    { id: "payments.release", title: "Payments ready to release", text: "Delivery reported, and release is allowed.", href: "/admin/payments?releasable=true", permission: "payments.release", size: exact(attention?.paymentsReleasable.count) },
    { id: "users.view", title: "Accounts waiting for approval", text: "New accounts that are still pending.", href: "/admin/users?status=pending", permission: "users.view", size: queueSize(ENDPOINTS.adminUsers, { status: "pending" }) },
    { id: "withdrawals.review", title: "Withdrawals to review", text: "Requests waiting for Finance. Approving pays nothing: no payout provider is connected.", href: "/admin/withdrawals?needsReview=true", permission: "payments.view", size: exact(attention?.withdrawalReview.count) },
    { id: "refund-requests.open", title: "Refund requests needing action", text: "Awaiting a decision, or accepted and not yet followed up. A request is not a refund.", href: "/admin/refund-requests?needsAction=true", permission: "payments.view", size: exact(attention?.refundRequests.count) },
    { id: "disputes.open", title: "Open disputes", text: "Brand disputes of a reported delivery.", href: "/admin/payments?disputed=true", permission: "payments.view", size: exact(attention?.openDisputes.count) },
    { id: "disputes.upheld", title: "Upheld disputes awaiting a policy decision", text: "Upheld by two administrators. The payment stays in escrow; no money has been returned.", href: "/admin/payments?disputed=true", permission: "payments.view", size: exact(attention?.upheldDisputesAwaitingPolicy.count) },
    { id: "reconciliation.open", title: "Open payment exceptions", text: "Reconciliation issues that still need a note or the provider's answer.", href: "/admin/reconciliation", permission: "payments.view", size: exact(diagnostics?.exceptions.open) },
  ];
  const mine = queues.filter((queue) => permissions.includes(queue.permission));
  const sizes = await Promise.all(mine.map((queue) => queue.size));
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminHeader title="Overview" text="What needs your attention. Counts come from the live lists; a plus sign means there may be more than one page." />
      {mine.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-6 py-12 text-center text-sm text-body">Your role has no review queues. Use the menu for the areas you can open.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {mine.map((queue, index) => (
            <li key={queue.id} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <p className="text-sm font-semibold text-heading">{queue.title}</p>
              <p data-testid={`queue-${queue.id}`} className="mt-2 font-display text-3xl font-extrabold tabular-nums text-heading">
                {sizeText(sizes[index] ?? null)}
              </p>
              <p className="mt-1 text-xs text-muted">{queue.text}</p>
              <Link href={queue.href} className="mt-3 inline-flex text-sm font-semibold text-primary hover:text-primary-hover">
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
