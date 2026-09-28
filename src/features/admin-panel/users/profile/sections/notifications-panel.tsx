import { FiBell } from "react-icons/fi";
import { formatRelativeTime } from "@/lib/utils";
import type { UserNotification } from "@/types/user-management";

export function NotificationsPanel({ notifications }: { notifications: UserNotification[] }) {
  return (
    <section aria-labelledby="notifications-heading" className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 id="notifications-heading" className="font-display text-base font-bold text-heading">
        Notifications Sent
      </h2>
      <p className="mt-1 text-sm text-muted">Automatic updates and admin messages this user received.</p>

      {notifications.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Nothing sent yet.</p>
      ) : (
        <ol className="mt-3 space-y-4">
          {notifications.map((notification) => (
            <li key={notification.id} className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-info-light text-navy">
                <FiBell size={13} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-heading">{notification.title}</p>
                <p className="mt-0.5 text-sm text-body">{notification.body}</p>
                <time dateTime={notification.sentAt} className="mt-0.5 block text-xs text-muted">
                  {formatRelativeTime(notification.sentAt)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
