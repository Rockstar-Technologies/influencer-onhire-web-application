"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/shared/button";
import { PAYMENT_METHOD_LABELS, formatCompact, formatFrs } from "@/lib/format";
import { getCreatorApplication } from "@/services/creator-application.service";
import type { CreatorApplication } from "@/types/creator-application";
import { PlatformIcon } from "../apply-ui";

type State = { status: "loading" } | { status: "missing" } | { status: "ready"; application: CreatorApplication };

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

export function SubmittedView({ applicationId }: { applicationId?: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const load = applicationId ? getCreatorApplication(applicationId) : Promise.resolve(null);
    load.then((application) => setState(application ? { status: "ready", application } : { status: "missing" }));
  }, [applicationId]);

  if (state.status === "loading") return <div className="h-72 animate-pulse rounded-2xl bg-surface" aria-busy="true" />;
  if (state.status === "missing") {
    return (
      <div className="rounded-2xl border border-border bg-surface px-6 py-10 text-center">
        <h1 className="text-2xl font-bold text-heading">We couldn&apos;t find that application</h1>
        <p className="mx-auto mt-2 max-w-md text-body">
          It may have been submitted in another tab, or the page was refreshed. You can start a new application below.
        </p>
        <div className="mt-6 flex justify-center">
          <Button href="/for-creators/apply/profile">Start My Profile</Button>
        </div>
      </div>
    );
  }

  const { basics, audience, rates, id } = state.application;
  const firstName = basics.fullName.split(" ")[0];
  const fromPrice = Math.min(...rates.prices.map((p) => p.price));
  const terms = [`Minimum booking: ${rates.minimumBooking}`, rates.deliverables, rates.revisions, rates.usageRights, rates.depositTerms];

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-success/10 px-5 py-4" role="status">
        <p className="font-semibold text-success">Profile submitted — thank you, {firstName}!</p>
        <p className="mt-1 text-sm text-body">
          Our team is reviewing it now. We&apos;ll message you on {rates.payoutAccounts[0]?.number} once it&apos;s approved
          and live. Reference: {id}
        </p>
      </div>

      <p className="text-xs font-bold uppercase tracking-widest text-primary">Your profile preview</p>

      <section className="flex flex-wrap items-center gap-5 rounded-2xl border border-border bg-surface p-6">
        {basics.photoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview of the uploaded photo
          <img src={basics.photoDataUrl} alt={basics.fullName} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-light text-2xl font-bold text-primary">
            {basics.fullName
              .split(/\s+/)
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-heading sm:text-2xl">{basics.fullName}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              Under review
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {basics.niche} · {basics.city}
          </p>
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
            <p className="leading-relaxed">{basics.bio}</p>
          </Card>
          {audience.collaborations.length > 0 && (
            <Card title="Past Collaborations">
              <ul className="grid gap-3 sm:grid-cols-3">
                {audience.collaborations.map((c) => (
                  <li key={`${c.brand}-${c.year}`} className="rounded-xl border border-border p-3">
                    <p className="font-semibold text-heading">{c.brand}</p>
                    <p className="mt-0.5 text-xs text-muted">{[c.description, c.year].filter(Boolean).join(" · ")}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card title="Brand Fit">
            <ul className="flex flex-wrap gap-2">
              {audience.brandFit.map((tag) => (
                <li key={tag} className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary">
                  {tag}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card title="Platform Pricing">
            <p className="font-semibold text-primary">From {formatFrs(fromPrice)}</p>
          </Card>
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
                  {PAYMENT_METHOD_LABELS[account.method]}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Button href="/creator/requests">Go to Creator Dashboard</Button>
        <Button href="/for-creators" variant="outline">
          Back to For Creators
        </Button>
      </div>
    </div>
  );
}
