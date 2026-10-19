import Link from "next/link";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { PermissionCode } from "@/lib/domain/vocabulary";
import { queueSize } from "./server";
import type { QueueSize } from "./server";
import { AdminHeader } from "./ui";

interface Queue {
  title: string;
  text: string;
  href: string;
  permission: PermissionCode;
  size: Promise<QueueSize | null>;
}

const sizeText = (size: QueueSize | null) => (size === null ? "—" : `${size.count}${size.more ? "+" : ""}`);

/**
 * What is waiting for this administrator, counted from the real lists (the API has no dashboard counts yet). Only queues the administrator may open are
 * shown. A figure that can't be read is a dash, never a guess. There are no revenue or growth figures: no source for them exists.
 */
export async function OverviewPage({ permissions }: { permissions: readonly PermissionCode[] }) {
  const queues: Queue[] = [
    { title: "Creator applications to review", text: "Submitted and waiting for a decision.", href: "/admin/applications", permission: "applications.review", size: queueSize(ENDPOINTS.adminApplications, { status: "under_review" }) },
    { title: "Campaigns to review", text: "Submitted by brands and waiting for a decision.", href: "/admin/campaigns", permission: "campaigns.review", size: queueSize(ENDPOINTS.adminCampaigns, { status: "pending_review" }) },
    { title: "Payments ready to release", text: "Delivery reported, and release is allowed.", href: "/admin/payments?releasable=true", permission: "payments.release", size: queueSize(ENDPOINTS.adminPayments, { releasable: "true" }) },
    { title: "Accounts waiting for approval", text: "New accounts that are still pending.", href: "/admin/users?status=pending", permission: "users.view", size: queueSize(ENDPOINTS.adminUsers, { status: "pending" }) },
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
            <li key={queue.href} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <p className="text-sm font-semibold text-heading">{queue.title}</p>
              <p data-testid={`queue-${queue.permission}`} className="mt-2 font-display text-3xl font-extrabold tabular-nums text-heading">
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
