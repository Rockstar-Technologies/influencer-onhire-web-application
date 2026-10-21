import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import type { PermissionCode } from "@/lib/domain/vocabulary";
import { formatFcfa } from "@/lib/format";
import { ApplicationDecision } from "./decisions";
import { APPLICATION_STATUS_TEXT, dateTime, label } from "./mapping";
import { loadApplication } from "./server";
import { AdminHeader, Card, Facts, Pill } from "./ui";

/** The submitted application exactly as it was frozen. Payout details are only the network and the last three digits (that is all the API returns). */
export async function ApplicationDetailPage({ id, viewer }: { id: string; viewer: { permissions: readonly PermissionCode[] } }) {
  const application = await loadApplication(id);
  const { profile } = application;
  const canDecide = viewer.permissions.includes("applications.review") && application.status === "under_review";
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/admin/applications" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover">
        <FiArrowLeft aria-hidden />
        Back to applications
      </Link>
      <AdminHeader title={profile.displayName ?? application.applicant.fullName} text={`${application.applicant.fullName} · ${application.applicant.email}`} action={<Pill tone={application.status === "approved" ? "good" : application.status === "rejected" ? "bad" : "wait"}>{label(APPLICATION_STATUS_TEXT, application.status)}</Pill>} />

      <Card title="Applicant">
        <Facts items={[["Phone", application.applicant.phone ?? "—"], ["Account", application.applicant.accountStatus], ["Submitted", dateTime(application.submittedAt)], ["Reviewed", dateTime(application.reviewedAt)]]} />
        {application.reviewNote && (
          <p className="mt-4 rounded-lg bg-surface-alt px-4 py-3 text-sm text-body">
            <span className="font-semibold text-heading">Review note:</span> {application.reviewNote}
          </p>
        )}
      </Card>

      <Card title="Profile">
        <Facts
          items={[
            ["City", profile.city?.name ?? "—"],
            ["Niches", application.niches.map((n) => (n.isPrimary ? `${n.name} (main)` : n.name)).join(", ") || "—"],
            ["Language", profile.language ?? "—"],
            ["Minimum booking", profile.minimumBooking?.label ?? "—"],
            ["Deliverables", profile.deliverables ?? "—"],
            ["Revision rounds", profile.revisionsRounds ?? "—"],
            ["Usage rights", profile.usageRightsMonths ? `${profile.usageRightsMonths} months` : "—"],
            ["Deposit terms", profile.depositTerms ?? "—"],
          ]}
        />
        {profile.bio && <p className="mt-4 whitespace-pre-line text-sm text-body">{profile.bio}</p>}
      </Card>

      <Card title="Platforms and rates (self-reported)">
        <ul className="divide-y divide-border-light text-sm">
          {application.platforms.map((platform) => (
            <li key={platform.code} className="flex flex-wrap justify-between gap-2 py-2">
              <span className="font-medium text-heading">
                {platform.name} {platform.handle}
              </span>
              <span className="text-body">
                {platform.followers.toLocaleString("en-US")} followers · {formatFcfa(platform.priceXaf)}
              </span>
            </li>
          ))}
        </ul>
        {application.collaborations.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-heading">Past collaborations</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-body">
              {application.collaborations.map((c) => (
                <li key={c.position}>
                  {c.brandName} ({c.year}){c.description ? ` · ${c.description}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
        {application.brandFit.length > 0 && <p className="mt-4 text-sm text-body">Brand fit: {application.brandFit.join(", ")}</p>}
      </Card>

      <Card title="Payout method">
        <ul className="text-sm text-body">
          {application.payoutMethods.map((method) => (
            <li key={`${method.method}-${method.last3}`}>
              {method.methodName} · number ending {method.last3}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">Full numbers are never shown to staff.</p>
      </Card>

      <Card title="Decision">
        {viewer.permissions.includes("applications.review") ? <ApplicationDecision id={application.id} canDecide={canDecide} /> : <p className="text-sm text-muted">Your role can’t decide applications.</p>}
      </Card>
    </div>
  );
}
