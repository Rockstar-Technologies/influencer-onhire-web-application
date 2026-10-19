import Link from "next/link";
import { cn } from "@/lib/utils";
import { NotificationList } from "./notification-list";
import { badgeText } from "./mapping";
import type { NotificationArea } from "./mapping";
import { loadNotifications, notificationsPath } from "./server";

/** The signed-in person's own in-app notifications, as the API holds them. In-app only: nothing here is sent by e-mail or SMS. */
export async function NotificationsPage({ area, unread, cursor }: { area: NotificationArea; unread?: boolean; cursor?: string }) {
  const page = await loadNotifications(area, { ...(unread ? { unread } : {}), ...(cursor ? { cursor } : {}) });
  const base = notificationsPath(area);
  const href = (next: { unread?: boolean; cursor?: string | null }) => {
    const query = new URLSearchParams();
    if (next.unread) query.set("unread", "true");
    if (next.cursor) query.set("cursor", next.cursor);
    const text = query.toString();
    return text ? `${base}?${text}` : base;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-heading sm:text-3xl">Notifications</h1>
        <p className="mt-2 text-sm text-body">
          Updates about your account, requests and payments. These are shown here in the app only; nothing is sent by e-mail or SMS.
        </p>
      </div>

      <nav aria-label="Filter notifications" className="flex flex-wrap gap-2">
        {[false, true].map((onlyUnread) => (
          <Link
            key={String(onlyUnread)}
            href={href({ unread: onlyUnread })}
            aria-current={page.unreadOnly === onlyUnread ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              page.unreadOnly === onlyUnread ? "border-primary bg-primary text-white" : "border-border bg-surface text-body hover:border-primary-border hover:text-primary",
            )}
          >
            {onlyUnread ? `Unread${badgeText(page.unread) ? ` (${badgeText(page.unread)})` : ""}` : "All"}
          </Link>
        ))}
      </nav>

      {page.items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center">
          <p className="font-semibold text-heading">{page.unreadOnly ? "You have no unread notifications." : "You have no notifications yet."}</p>
          <p className="mt-1 text-sm text-body">New updates will appear here.</p>
        </div>
      ) : (
        <NotificationList area={area} items={page.items} unread={page.unread} />
      )}

      {page.nextCursor && (
        <div className="text-center">
          <Link href={href({ unread: page.unreadOnly, cursor: page.nextCursor })} className="inline-flex rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-heading hover:bg-surface-alt">
            Show more
          </Link>
        </div>
      )}
    </div>
  );
}
