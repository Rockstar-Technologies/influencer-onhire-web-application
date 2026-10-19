import Link from "next/link";
import { APPLICATION_STATUSES, loadApplications } from "./server";
import type { ApplicationQuery } from "./server";
import { APPLICATION_STATUS_TEXT, dateTime, label } from "./mapping";
import { AdminHeader, Empty, FilterChips, MoreLink, Pill, queryHref } from "./ui";

const BASE = "/admin/applications";
const TONE = { under_review: "wait", approved: "good", rejected: "bad", draft: "neutral" } as const;

/** The creator-application review queue (oldest submission first) and its history, from the API. */
export async function ApplicationsPage({ query }: { query: ApplicationQuery }) {
  const page = await loadApplications(query);
  const href = (change: Partial<Record<keyof ApplicationQuery, string | null>>) => queryHref(BASE, { q: query.q, status: query.status === "under_review" ? null : query.status, ...change });
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminHeader title="Creator applications" text="Applications waiting for review come first, oldest first. Open one to read it and approve or reject it." />
      <form action={BASE} role="search" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="min-w-0 flex-1">
          <label htmlFor="app-q" className="text-xs font-semibold uppercase tracking-wide text-muted">
            Applicant name, e-mail or display name
          </label>
          <input id="app-q" name="q" defaultValue={query.q ?? ""} minLength={2} maxLength={100} className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-heading outline-none focus:border-primary" />
        </div>
        {query.status !== "under_review" && <input type="hidden" name="status" value={query.status} />}
        <button type="submit" className="h-10 rounded-lg bg-navy px-5 text-sm font-semibold text-white hover:bg-navy-hover">
          Search
        </button>
      </form>
      <FilterChips label="Filter by status" current={query.status} href={(value) => href({ status: value })} options={APPLICATION_STATUSES.filter((s) => s !== "draft").map((value) => ({ value, text: APPLICATION_STATUS_TEXT[value] as string }))} />

      {page.items.length === 0 ? (
        <Empty>{query.status === "under_review" ? "No applications are waiting for review." : "No applications with this status."}</Empty>
      ) : (
        <ul className="space-y-3">
          {page.items.map((application) => (
            <li key={application.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <div className="min-w-0">
                <Link href={`${BASE}/${application.id}`} className="font-semibold text-heading hover:text-primary">
                  {application.displayName ?? application.applicant.fullName}
                </Link>
                <p className="text-xs text-muted">
                  {application.applicant.fullName} · {application.applicant.email}
                </p>
                <p className="mt-1 text-xs text-muted">Submitted {dateTime(application.submittedAt)}</p>
              </div>
              <Pill tone={TONE[application.status as keyof typeof TONE] ?? "neutral"}>{label(APPLICATION_STATUS_TEXT, application.status)}</Pill>
            </li>
          ))}
        </ul>
      )}
      {page.nextCursor && <MoreLink href={href({ cursor: page.nextCursor })} />}
    </div>
  );
}
