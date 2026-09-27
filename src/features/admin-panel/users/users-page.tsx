import { FiPlus } from "react-icons/fi";
import type { UserQuery } from "@/types/user-management";
import { AdminTeam } from "./sections/admin-team";
import { ModerationQueue } from "./sections/moderation-queue";
import { SecurityAlerts } from "./sections/security-alerts";
import { UserDirectory } from "./sections/user-directory";
import { UserStats } from "./sections/user-stats";

export function UsersPage({ query }: { query: UserQuery }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-heading sm:text-3xl">User Management</h1>
          <p className="mt-2 text-sm text-body">Approve, monitor and support influencers and brands, and manage your admin team.</p>
        </div>
        <a
          href="#invite"
          className="inline-flex items-center gap-2 self-start rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-hover"
        >
          <FiPlus aria-hidden />
          Invite Admin
        </a>
      </div>

      <UserStats />
      <UserDirectory query={query} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <SecurityAlerts />
        <ModerationQueue />
      </div>

      <AdminTeam />
    </div>
  );
}
