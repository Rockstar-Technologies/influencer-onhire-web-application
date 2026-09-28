import { cn } from "@/lib/utils";
import type { CampaignMatchPreview, MatchStrength } from "@/types/campaign";
import { joinWithAmpersand } from "../preview-format";
import { Chip } from "./campaign-brief-card";

const AVATAR_TONES = ["bg-primary", "bg-heading", "bg-success"];

const STRENGTH_STYLES: Record<MatchStrength, { label: string; className: string }> = {
  strong: { label: "Strong Match", className: "bg-success/10 text-success" },
  good: { label: "Good Match", className: "bg-primary-light text-primary" },
};

export function MatchingPreviewCard({ preview }: { preview: CampaignMatchPreview }) {
  const { summary, topMatches, broadened } = preview;
  const nicheLabel = summary.niches.length ? joinWithAmpersand(summary.niches) : "";
  const audience = [`${summary.matchedCount} verified`, nicheLabel, summary.matchedCount === 1 ? "influencer" : "influencers"]
    .filter(Boolean)
    .join(" ");
  const hidden = summary.matchedCount - topMatches.length;

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="text-base font-bold text-heading">Matching Preview</h2>

      <div className="mt-4 flex items-center gap-4 rounded-xl border border-primary-border bg-primary-light px-4 py-4">
        <span className="shrink-0 text-3xl font-extrabold tabular-nums text-primary">{summary.matchedCount}</span>
        <p className="text-sm text-body">
          {summary.matchedCount > 0 ? (
            <>
              This campaign will be sent to <strong className="font-semibold text-heading">{audience}</strong> matching the
              criteria below.
            </>
          ) : (
            <>No influencers match these criteria yet. Try adding a location, a broader interest, or a lower engagement rate.</>
          )}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Chip>Niche: {nicheLabel || "Any"}</Chip>
        <Chip>Location: {summary.locations.length ? joinWithAmpersand(summary.locations) : "All Cameroon"}</Chip>
        {summary.minEngagementRate ? <Chip>Min. Engagement: {summary.minEngagementRate}%+</Chip> : null}
      </div>

      {broadened && (
        <p className="mt-4 text-sm text-muted">
          Search broadened to include {joinWithAmpersand(broadened.addedLocations)} — fewer than 5{" "}
          {nicheLabel ? `${nicheLabel} ` : ""}influencers matched {broadened.primaryLocation} alone.
        </p>
      )}

      {topMatches.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2.5">
          {topMatches.map((match, index) => {
            const strength = STRENGTH_STYLES[match.strength];
            return (
              <li key={match.id} className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-3">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                    AVATAR_TONES[index % AVATAR_TONES.length]
                  )}
                >
                  {match.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-heading">{match.name}</p>
                  <p className="text-xs text-muted">
                    {match.niche} · {match.city} · {match.engagementRate}% engagement
                  </p>
                </div>
                <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", strength.className)}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {strength.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 text-xs text-muted">
        {hidden > 0 && `+ ${hidden} more matching ${hidden === 1 ? "influencer" : "influencers"} not shown. `}This is an
        example match set using sample data.
      </p>
    </section>
  );
}
