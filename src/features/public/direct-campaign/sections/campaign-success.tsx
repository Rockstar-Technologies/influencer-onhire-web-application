"use client";

import { useEffect, useRef } from "react";
import { FiCheck } from "react-icons/fi";
import { Button } from "@/components/shared/button";
import { campaignDays } from "../campaign-form-rules";
import type { Campaign, CampaignFormOptions } from "@/types/direct-campaign";

interface CampaignSuccessProps {
  campaign: Campaign;
  options: CampaignFormOptions;
  onPostAnother: () => void;
}

function joinLabels(values: string[]) {
  if (values.length <= 1) return values.join("");
  return `${values.slice(0, -1).join(", ")} & ${values[values.length - 1]}`;
}

export function CampaignSuccess({ campaign, options, onPostAnother }: CampaignSuccessProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the confirmation so screen reader and keyboard users land on it.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const labelOf = (list: { value: string; label: string }[], value: string) =>
    list.find((option) => option.value === value)?.label ?? value;

  const niche = labelOf(options.niches, campaign.niche);
  const locations = campaign.locations.map((value) => labelOf(options.locations, value));
  const engagement = campaign.minEngagement !== "any" ? labelOf(options.engagementLevels, campaign.minEngagement) : "";
  const { matchedCount } = campaign;
  const days = campaignDays(campaign.startDate, campaign.endDate);

  const details = [
    { label: "Reference", value: campaign.reference },
    { label: "Budget", value: `${campaign.budget.toLocaleString("en-US")} FCFA` },
    { label: "Schedule", value: `${campaign.startDate} → ${campaign.endDate}${days ? ` (${days} ${days === 1 ? "day" : "days"})` : ""}` },
  ];

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-sm sm:p-10">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-light text-success">
        <FiCheck size={30} />
      </span>
      <h2 ref={headingRef} tabIndex={-1} className="mt-6 text-2xl font-bold text-heading focus:outline-none">
        Your Campaign Has Been Posted!
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-body">
        &ldquo;{campaign.title}&rdquo; is now visible to matching, active influencers. You&apos;ll be notified the
        moment one accepts.
      </p>

      <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-warning-light px-3 py-1 text-xs font-bold text-warning">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" />
        Pending Review
      </span>

      <div className="mt-6 flex items-center gap-4 rounded-xl bg-primary-light px-5 py-4 text-left">
        <span className="text-4xl font-extrabold text-primary">{matchedCount}</span>
        <p className="text-sm text-body">
          {matchedCount > 0 ? (
            <>
              Campaign sent to{" "}
              <strong className="text-heading">
                {matchedCount} verified {niche} {matchedCount === 1 ? "influencer" : "influencers"}
              </strong>
              {locations.length > 0 && <> in {joinLabels(locations)}</>}
              {engagement && <> with {engagement} engagement</>}.
            </>
          ) : (
            <>No verified influencers match these criteria yet. Your campaign stays open and matching influencers will be notified as they join.</>
          )}
        </p>
      </div>

      <dl className="mt-6 divide-y divide-border rounded-xl border border-border text-left text-sm">
        {details.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right font-semibold text-heading">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button href="/coming-soon?title=My+Campaigns" className="rounded-lg px-6">
          View My Campaigns
        </Button>
        <Button type="button" variant="outline" onClick={onPostAnother} className="rounded-lg px-6">
          Post Another Campaign
        </Button>
      </div>
    </div>
  );
}
