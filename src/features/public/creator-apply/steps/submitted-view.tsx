import type { ReactNode } from "react";
import { Button } from "@/components/shared/button";
import { PAYMENT_METHOD_LABELS, formatCompact, formatFrs } from "@/lib/format";
import { revisionsLabel, usageRightsLabel } from "@/features/creator-application/mapping";
import type { ApplicationOptions, ApplicationState } from "@/lib/api/schemas";
import { DEPOSIT_TERMS_LABELS } from "@/lib/domain/labels";
import { PlatformIcon } from "../apply-ui";
import { ReapplyButton } from "./reapply-button";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-sm font-bold text-heading">{title}</h2>
      <div className="mt-3 text-sm text-body">{children}</div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg className="mt-0.5 shrink-0 text-success" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STATUS_BADGE = {
  under_review: { label: "Under review", className: "bg-warning/10 text-warning" },
  approved: { label: "Approved", className: "bg-success/10 text-success" },
  rejected: { label: "Not approved", className: "bg-danger/10 text-danger" },
  draft: { label: "Draft", className: "bg-border-light text-body" },
} as const;

function formatDay(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
}

/** The submitted application as the SERVER holds it (never as the browser remembers it), with its real review status. */
export function SubmittedView({ state, options }: { state: ApplicationState; options: ApplicationOptions }) {
  const { application, profile, audience, rates } = state;
  const name = profile.displayName ?? "Creator";
  const firstName = name.split(" ")[0] ?? name;
  const niche = options.niches.find((n) => n.slug === profile.primaryNiche)?.name ?? profile.primaryNiche ?? "";
  const city = options.cities.find((c) => c.slug === profile.city)?.name ?? profile.city ?? "";
  const brandFit = audience.brandFit.map((id) => options.brandFit.find((t) => t.id === id)?.name).filter((n): n is string => Boolean(n));
  const fromPrice = rates.prices.length ? Math.min(...rates.prices.map((p) => p.priceXaf)) : null;
  const booking = options.minimumBookingOptions.find((o) => o.code === rates.minimumBooking)?.label;
  const terms = [
    booking ? `Minimum booking: ${booking}` : null,
    rates.deliverables,
    rates.revisionsRounds ? revisionsLabel(rates.revisionsRounds) : null,
    rates.usageRightsMonths ? usageRightsLabel(rates.usageRightsMonths) : null,
    rates.depositTerms ? DEPOSIT_TERMS_LABELS[rates.depositTerms] : null,
  ].filter((term): term is string => Boolean(term));
  const badge = STATUS_BADGE[application.status];

  return (
    <div className="flex flex-col gap-5">
      {application.status === "under_review" && (
        <div className="rounded-2xl bg-success/10 px-5 py-4" role="status">
          <p className="font-semibold text-success">Profile submitted — thank you, {firstName}!</p>
          <p className="mt-1 text-sm text-body">
            Our team is reviewing it now{application.submittedAt ? ` (submitted ${formatDay(application.submittedAt)})` : ""}. You can sign in at any
            time to see its status; once it&apos;s approved your profile goes live.
          </p>
        </div>
      )}
      {application.status === "approved" && (
        <div className="rounded-2xl bg-success/10 px-5 py-4" role="status">
          <p className="font-semibold text-success">Your profile has been approved, {firstName}!</p>
          <p className="mt-1 text-sm text-body">You can now go to your creator dashboard.</p>
        </div>
      )}
      {application.status === "rejected" && (
        <div className="rounded-2xl bg-danger/10 px-5 py-4" role="alert">
          <p className="font-semibold text-danger">Your application was not approved</p>
          {application.feedback && <p className="mt-1 text-sm text-heading">{application.feedback.message}</p>}
          {state.canReapply && (
            <div className="mt-4">
              <ReapplyButton />
            </div>
          )}
        </div>
      )}

      <p className="text-xs font-bold uppercase tracking-widest text-primary">Your profile preview</p>

      <section className="flex flex-wrap items-center gap-5 rounded-2xl border border-border bg-surface p-6">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-light text-2xl font-bold text-primary" aria-hidden>
          {name
            .split(/\s+/)
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-heading sm:text-2xl">{name}</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {badge.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">{[niche, city].filter(Boolean).join(" · ")}</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {audience.platforms.map((p) => (
              <li key={p.platform} className="flex items-center gap-1.5 text-sm font-semibold text-heading">
                <PlatformIcon platform={p.platform} size={16} />
                {formatCompact(p.followers)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-5">
          <Card title={`About ${firstName}`}>
            <p className="leading-relaxed">{profile.bio}</p>
          </Card>
          {audience.collaborations.length > 0 && (
            <Card title="Past Collaborations">
              <ul className="grid gap-3 sm:grid-cols-3">
                {audience.collaborations.map((c) => (
                  <li key={`${c.brandName}-${c.year}`} className="rounded-xl border border-border p-3">
                    <p className="font-semibold text-heading">{c.brandName}</p>
                    <p className="mt-0.5 text-xs text-muted">{[c.description, c.year].filter(Boolean).join(" · ")}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card title="Brand Fit">
            <ul className="flex flex-wrap gap-2">
              {brandFit.map((tag) => (
                <li key={tag} className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary">
                  {tag}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card title="Platform Pricing">{fromPrice !== null && <p className="font-semibold text-primary">From {formatFrs(fromPrice)}</p>}</Card>
          <Card title="Contract Terms">
            <ul className="flex flex-col gap-2">
              {terms.map((term) => (
                <li key={term} className="flex gap-2">
                  <CheckIcon />
                  {term}
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Payment Methods">
            <ul className="flex flex-wrap gap-2">
              {rates.payoutAccounts.map((account) => (
                <li key={account.method} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-heading">
                  {PAYMENT_METHOD_LABELS[account.method]} · ending {account.last3}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        {application.status === "approved" && <Button href="/creator/requests">Go to Creator Dashboard</Button>}
        <Button href="/for-creators" variant={application.status === "approved" ? "outline" : "primary"}>
          Back to For Creators
        </Button>
      </div>
    </div>
  );
}
