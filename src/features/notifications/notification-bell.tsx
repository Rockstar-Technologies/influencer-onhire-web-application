import Link from "next/link";
import { FiBell } from "react-icons/fi";
import { badgeText, type NotificationArea } from "./mapping";
import { loadUnreadCount, notificationsPath } from "./server";

/**
 * The header bell: a link to the person's notifications with the API's unread count. If the count can't be loaded the badge is simply left out
 * (the link still works); a number is never guessed.
 */
export async function NotificationBell({ area }: { area: NotificationArea }) {
  const unread = await loadUnreadCount();
  const badge = unread === null ? null : badgeText(unread);
  return (
    <Link
      href={notificationsPath(area)}
      aria-label={badge ? `Notifications, ${unread} unread` : "Notifications"}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-heading hover:bg-surface-alt"
    >
      <FiBell aria-hidden />
      {badge && (
        <span data-testid="unread-badge" className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-danger px-1.5 text-center text-[10px] font-bold leading-5 text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}
