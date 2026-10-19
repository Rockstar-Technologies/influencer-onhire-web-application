import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import type { PermissionCode } from "@/lib/domain/vocabulary";
import { UserModeration } from "./decisions";
import { ACCOUNT_STATUS_TEXT, APPLICATION_STATUS_TEXT, ROLE_LABELS, dateTime, label, userActions } from "./mapping";
import { loadUser } from "./server";
import { AdminHeader, Card, Facts, Pill } from "./ui";

/** One account from the API: never password data, sessions or payout numbers (the API does not return them). Account actions need `users.moderate`. */
export async function UserDetailPage({ id, viewer }: { id: string; viewer: { id: string; permissions: readonly PermissionCode[] } }) {
  const user = await loadUser(id);
  const canModerate = viewer.permissions.includes("users.moderate");
  const available = canModerate ? userActions(user, { id: viewer.id, canManageAdmins: viewer.permissions.includes("team.manage") }, user.id) : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover">
        <FiArrowLeft aria-hidden />
        Back to users
      </Link>
      <AdminHeader title={user.fullName} text={`${label(ROLE_LABELS, user.role)} · ${user.email}`} action={<Pill tone={user.status === "active" ? "good" : user.status === "pending" ? "wait" : "bad"}>{label(ACCOUNT_STATUS_TEXT, user.status)}</Pill>} />

      <Card title="Account">
        <Facts
          items={[
            ["Phone", user.phone ?? "—"],
            ["Joined", dateTime(user.createdAt)],
            ["Last active", dateTime(user.lastActiveAt)],
            ["Flagged", user.isFlagged ? "Yes" : "No"],
            ...(user.creatorProfile ? ([["Public username", user.creatorProfile.username], ["Display name", user.creatorProfile.displayName], ["City", user.creatorProfile.city ?? "—"]] as [string, string][]) : []),
            ...(user.brandProfile ? ([["Industry", user.brandProfile.industry ?? "—"], ["City", user.brandProfile.city ?? "—"]] as [string, string][]) : []),
          ]}
        />
      </Card>

      {user.applications && user.applications.length > 0 && (
        <Card title="Creator applications">
          <ul className="divide-y divide-border-light text-sm">
            {user.applications.map((application) => (
              <li key={application.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span>
                  {label(APPLICATION_STATUS_TEXT, application.status)} · submitted {dateTime(application.submittedAt)}
                </span>
                {viewer.permissions.includes("applications.review") && application.submittedAt && (
                  <Link href={`/admin/applications/${application.id}`} className="font-semibold text-primary hover:text-primary-hover">
                    Open application
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Account actions">
        {canModerate ? (
          <UserModeration id={user.id} available={available} />
        ) : (
          <p className="text-sm text-muted">Your role can view accounts but not change them.</p>
        )}
        <p className="mt-4 text-xs text-muted">The person is notified in the app with a fixed message. The reason you write is kept in the audit trail only. Nothing is sent by e-mail or SMS.</p>
      </Card>
    </div>
  );
}
