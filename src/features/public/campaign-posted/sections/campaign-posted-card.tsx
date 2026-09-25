"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/shared/button";
import { getCampaignById } from "@/services/campaigns.service";
import type { Campaign } from "@/types/campaign";

type LoadState = { status: "loading" } | { status: "ready"; campaign: Campaign } | { status: "missing" };

function CircleCheckIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function joinWithAmpersand(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} & ${items[items.length - 1]}`;
}

function MatchSummary({ campaign }: { campaign: Campaign }) {
  const { matchedCount, niches, locations, minEngagementRate } = campaign.match;
  const audience = [
    `${matchedCount} verified`,
    niches.length ? joinWithAmpersand(niches) : null,
    matchedCount === 1 ? "influencer" : "influencers",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex items-center gap-4 rounded-xl border border-primary-border bg-primary-light px-5 py-4 text-left">
      <span className="shrink-0 text-4xl font-extrabold tabular-nums text-primary">{matchedCount}</span>
      <p className="text-sm leading-relaxed text-body">
        Campaign sent to <strong className="font-semibold text-heading">{audience}</strong>
        {locations.length ? ` in ${joinWithAmpersand(locations)}` : " across Cameroon"}
        {minEngagementRate ? ` with ${minEngagementRate}%+ engagement` : ""}.
      </p>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-xl rounded-2xl border border-border bg-surface px-6 py-10 text-center shadow-sm sm:px-9">
      {children}
    </div>
  );
}

export function CampaignPostedCard({ campaignId }: { campaignId?: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const load = campaignId ? getCampaignById(campaignId) : Promise.resolve(null);
    load.then((campaign) => {
      if (!cancelled) setState(campaign ? { status: "ready", campaign } : { status: "missing" });
    });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  if (state.status === "loading") {
    return (
      <Card>
        <div className="mx-auto h-16 w-16 animate-pulse rounded-full bg-border-light" />
        <div className="mx-auto mt-6 h-6 w-2/3 animate-pulse rounded bg-border-light" />
        <div className="mx-auto mt-4 h-4 w-5/6 animate-pulse rounded bg-border-light" />
        <p className="sr-only">Loading your campaign…</p>
      </Card>
    );
  }

  if (state.status === "missing") {
    return (
      <Card>
        <h1 className="text-2xl font-extrabold text-heading">We couldn&apos;t find that campaign</h1>
        <p className="mx-auto mt-3 max-w-md text-body">
          The link may be out of date, or the page was refreshed before your campaign was saved. Post it again to send it
          to matching influencers.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button href="/campaigns/new">Post a Campaign</Button>
          <Button href="/campaigns" variant="outline">
            Back to Campaigns
          </Button>
        </div>
      </Card>
    );
  }

  const { campaign } = state;

  return (
    <Card>
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
        <CircleCheckIcon />
      </span>
      <h1 className="mt-6 text-2xl font-extrabold text-heading">Your Campaign Has Been Posted!</h1>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-body">
        &quot;{campaign.title}&quot; is now visible to matching, active influencers. You&apos;ll be notified the moment
        one accepts.
      </p>

      <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-sm font-semibold text-warning">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" />
        Pending Review
      </span>

      <div className="mt-5">
        <MatchSummary campaign={campaign} />
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button href="/brand/payments">View My Campaigns</Button>
        <Button href="/campaigns/new" variant="outline">
          Post Another Campaign
        </Button>
      </div>
    </Card>
  );
}
