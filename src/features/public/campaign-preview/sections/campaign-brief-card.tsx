import type { ReactNode } from "react";
import type { CampaignDraft } from "@/types/campaign";
import { formatDuration, formatFrs, joinWithAmpersand, splitList } from "../preview-format";

function CheckIcon() {
  return (
    <svg className="shrink-0 text-primary" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      {children}
    </span>
  );
}

export function CampaignBriefCard({ draft, brandName }: { draft: CampaignDraft; brandName: string }) {
  const deliverables = splitList(draft.deliverables);
  const interests = splitList(draft.interests);
  const audience = [draft.ageRange, joinWithAmpersand(splitList(draft.location))].filter(Boolean).join(", ");

  const facts: [string, string][] = [
    ["Budget", formatFrs(draft.budget)],
    ["Duration", formatDuration(draft.startDate, draft.endDate)],
    ["Target Audience", audience || "All audiences across Cameroon"],
  ];

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-heading">{draft.title}</h1>
          <p className="mt-1 text-sm text-muted">Posted by {brandName} · Just now</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
          Pending Review
        </span>
      </div>

      <dl className="mt-5 grid gap-4 rounded-xl bg-surface-alt p-4 sm:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</dt>
            <dd className="mt-1.5 text-sm font-bold text-heading">{value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-6 text-sm font-bold text-heading">Deliverables Expected</h2>
      <ul className="mt-3 flex flex-col gap-2.5">
        {deliverables.map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-sm text-body">
            <CheckIcon />
            {item}
          </li>
        ))}
      </ul>

      {interests.length > 0 && (
        <>
          <h2 className="mt-6 text-sm font-bold text-heading">Audience Interests</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {interests.map((interest) => (
              <Chip key={interest}>{interest}</Chip>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
