import { FiCalendar, FiClock, FiFlag, FiMapPin } from "react-icons/fi";
import { formatRelativeTimeInline, initials } from "@/lib/utils";
import type { PlatformUser } from "@/types/user-management";
import { AccountStatusBadge, AccountTypeTag } from "../../sections/user-badges";
import { ProfileActions } from "./profile-actions";

export function ProfileHeader({ user }: { user: PlatformUser }) {
  const joined = new Date(user.joinedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-info-light font-display text-lg font-bold text-navy">
          {initials(user.name)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-extrabold text-heading">{user.name}</h1>
            <AccountStatusBadge status={user.status} />
            {user.flagged && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-light px-2.5 py-1 text-xs font-semibold text-warning">
                <FiFlag aria-hidden /> Flagged
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-body">{user.email}</p>
          <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <li className="flex items-center gap-2">
              <AccountTypeTag type={user.type} /> {user.niche}
            </li>
            <li className="flex items-center gap-1.5">
              <FiMapPin aria-hidden /> {user.location}
            </li>
            <li className="flex items-center gap-1.5">
              <FiCalendar aria-hidden /> Joined {joined}
            </li>
            <li className="flex items-center gap-1.5">
              <FiClock aria-hidden /> Active {formatRelativeTimeInline(user.lastActiveAt)}
            </li>
          </ul>
        </div>
      </div>
      <ProfileActions user={user} />
    </section>
  );
}
