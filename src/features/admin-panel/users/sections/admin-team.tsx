import { StatusBadge } from "@/components/shared/status-badge";
import { formatRelativeTime, formatRelativeTimeInline, initials } from "@/lib/utils";
import { listTeamMembers } from "@/services/user-management.service";
import { InviteForm } from "./invite-form";
import { ADMIN_ROLE_LABELS } from "@/lib/domain/labels";

const COLUMNS = ["User", "Role", "Last active", "Status"];

export async function AdminTeam() {
  const team = await listTeamMembers();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section aria-labelledby="team-heading" className="min-w-0 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 id="team-heading" className="font-display text-base font-bold text-heading">
          Admin Team
        </h2>
        <p className="mt-1 text-sm text-muted">Staff who can sign in to this panel, and what they are allowed to do.</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                {COLUMNS.map((column) => (
                  <th key={column} scope="col" className="px-4 pb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {team.map((member) => (
                <tr key={member.id} className="transition-colors hover:bg-surface-alt">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-info-light text-xs font-bold text-navy">
                        {initials(member.name)}
                      </span>
                      <div className="min-w-0">
                        <span className="block font-semibold text-heading">{member.name}</span>
                        <span className="block truncate text-xs text-muted">{member.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-heading">{ADMIN_ROLE_LABELS[member.role]}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-body">
                    {member.status === "invited" ? (
                      <span className="text-muted">Invite sent {formatRelativeTimeInline(member.lastActiveAt)}</span>
                    ) : (
                      <time dateTime={member.lastActiveAt}>{formatRelativeTime(member.lastActiveAt)}</time>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {member.status === "active" ? (
                      <StatusBadge label="Active" badge="bg-success-light text-success-strong" dot="bg-success" />
                    ) : (
                      <StatusBadge label="Invited" badge="bg-border-light text-body" dot="bg-muted" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <InviteForm />
    </div>
  );
}
