import Link from "next/link";
import { loadUsers, USER_ROLES, USER_STATUSES } from "./server";
import type { UserQuery } from "./server";
import { ACCOUNT_STATUS_TEXT, ROLE_LABELS, dateTime, label } from "./mapping";
import { AdminHeader, Empty, FilterChips, MoreLink, Pill, queryHref } from "./ui";

const BASE = "/admin/users";
const TONE = { active: "good", pending: "wait", suspended: "bad", rejected: "bad" } as const;

/** The account list, straight from the API (it only ever returns what this administrator may see). Filters live in the URL. */
export async function UsersPage({ query }: { query: UserQuery }) {
  const page = await loadUsers(query);
  const href = (change: Partial<Record<keyof UserQuery, string | boolean | null>>) =>
    queryHref(BASE, { q: query.q, role: query.role, status: query.status, flagged: query.flagged, sort: query.sort === "created_at" ? null : query.sort, ...change });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminHeader title="Users" text="Every account on the platform. Open one to see its details and, if you may, suspend, reactivate or reject it." />

      <form action={BASE} role="search" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="min-w-0 flex-1">
          <label htmlFor="user-q" className="text-xs font-semibold uppercase tracking-wide text-muted">
            Name or e-mail
          </label>
          <input id="user-q" name="q" defaultValue={query.q ?? ""} minLength={2} maxLength={100} className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-heading outline-none focus:border-primary" />
        </div>
        {query.role && <input type="hidden" name="role" value={query.role} />}
        {query.status && <input type="hidden" name="status" value={query.status} />}
        <button type="submit" className="h-10 rounded-lg bg-navy px-5 text-sm font-semibold text-white hover:bg-navy-hover">
          Search
        </button>
        {query.q && (
          <Link href={href({ q: null })} className="h-10 content-center text-sm font-semibold text-primary">
            Clear search
          </Link>
        )}
      </form>

      <div className="space-y-3">
        <FilterChips label="Filter by role" current={query.role ?? null} href={(value) => href({ role: value })} options={[{ value: null, text: "All roles" }, ...USER_ROLES.map((value) => ({ value, text: ROLE_LABELS[value] as string }))]} />
        <FilterChips label="Filter by status" current={query.status ?? null} href={(value) => href({ status: value })} options={[{ value: null, text: "Any status" }, ...USER_STATUSES.map((value) => ({ value, text: ACCOUNT_STATUS_TEXT[value] as string }))]} />
      </div>

      {page.items.length === 0 ? (
        <Empty>No accounts match.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead>
              <tr className="bg-surface-alt text-[11px] font-semibold uppercase tracking-wider text-muted">
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {page.items.map((user) => (
                <tr key={user.id} className="hover:bg-surface-alt/70">
                  <td className="px-4 py-3.5">
                    <Link href={`${BASE}/${user.id}`} className="font-semibold text-heading hover:text-primary">
                      {user.fullName}
                    </Link>
                    <span className="block text-xs text-muted">{user.email}</span>
                  </td>
                  <td className="px-4 py-3.5 text-body">
                    {label(ROLE_LABELS, user.role)}
                    {user.isFlagged && <span className="ml-2 text-xs font-semibold text-danger">Flagged</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <Pill tone={TONE[user.status]}>{label(ACCOUNT_STATUS_TEXT, user.status)}</Pill>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-body">{dateTime(user.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-body">{dateTime(user.lastActiveAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {page.nextCursor && <MoreLink href={href({ cursor: page.nextCursor })} />}
    </div>
  );
}
