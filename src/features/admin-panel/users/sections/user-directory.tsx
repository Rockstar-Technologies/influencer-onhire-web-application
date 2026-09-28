import { FiUsers } from "react-icons/fi";
import { getUserFilterOptions, listPlatformUsers } from "@/services/user-management.service";
import type { UserQuery } from "@/types/user-management";
import { isFilteredQuery } from "../user-query";
import { UserFilters } from "./user-filters";
import { UserTable } from "./user-table";

export async function UserDirectory({ query }: { query: UserQuery }) {
  const [users, options] = await Promise.all([listPlatformUsers(query), getUserFilterOptions()]);
  const isFiltered = isFilteredQuery(query);

  return (
    <section aria-labelledby="directory-heading" className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4">
        <h2 id="directory-heading" className="font-display text-base font-bold text-heading">
          Influencers &amp; Brands
        </h2>
        <p className="mt-1 text-sm text-muted">Everyone with an account on the marketplace.</p>
      </div>

      <UserFilters query={query} options={options} />

      {users.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <FiUsers className="text-muted" size={28} aria-hidden />
          <p className="mt-3 font-display text-base font-bold text-heading">
            {isFiltered ? "No users match these filters" : "No users yet"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {isFiltered ? "Try widening the location, niche or engagement filters." : "New sign-ups will appear here for approval."}
          </p>
        </div>
      ) : (
        <>
          <UserTable users={users} />
          <p className="mt-4 px-4 text-xs text-muted">
            Showing {users.length} {users.length === 1 ? "user" : "users"}
          </p>
        </>
      )}
    </section>
  );
}
