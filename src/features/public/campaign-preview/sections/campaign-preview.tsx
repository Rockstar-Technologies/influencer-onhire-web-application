"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { getCampaignDraft, previewCampaignMatches, publishCampaignDraft } from "@/services/campaigns.service";
import type { CampaignDraft, CampaignMatchPreview } from "@/types/campaign";
import { CampaignBriefCard } from "./campaign-brief-card";
import { InfluencerViewCard } from "./influencer-view-card";
import { MatchingPreviewCard } from "./matching-preview-card";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; draft: CampaignDraft; preview: CampaignMatchPreview }
  | { status: "missing" };

export function CampaignPreview({ draftId, brandName }: { draftId?: string; brandName: string }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const draft = draftId ? await getCampaignDraft(draftId) : null;
      if (!draft) return { status: "missing" } as const;
      const preview = await previewCampaignMatches(draft);
      return { status: "ready", draft, preview } as const;
    }

    load().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  const editHref = draftId ? `/campaigns/new?draft=${encodeURIComponent(draftId)}` : "/campaigns/new";

  async function handlePost(draft: CampaignDraft) {
    setPosting(true);
    setPostError(null);
    try {
      const campaign = await publishCampaignDraft(draft.id);
      router.push(`/campaigns/posted?id=${encodeURIComponent(campaign.id)}`);
    } catch {
      setPostError("We couldn't post your campaign. Check your connection and try again.");
      setPosting(false);
    }
  }

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-5" aria-busy="true">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-48 animate-pulse rounded-2xl border border-border bg-surface" />
        ))}
        <p className="sr-only">Loading your campaign preview…</p>
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="rounded-2xl border border-border bg-surface px-6 py-10 text-center">
        <h1 className="text-2xl font-extrabold text-heading">This preview is no longer available</h1>
        <p className="mx-auto mt-3 max-w-md text-body">
          Previews last until the page is refreshed or the campaign is posted. Fill in the campaign details again to see
          a fresh preview.
        </p>
        <div className="mt-6 flex justify-center">
          <Button href="/campaigns/new">Start a Campaign</Button>
        </div>
      </div>
    );
  }

  const { draft, preview } = state;

  return (
    <div className="flex flex-col gap-5">
      <Link href={editHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover">
        <span aria-hidden>←</span> Back to Edit Campaign
      </Link>

      <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
        <strong className="font-semibold">Preview only</strong> — this campaign hasn&apos;t been posted yet. Review it the
        way influencers will see it, then post it when you&apos;re ready.
      </p>

      <CampaignBriefCard draft={draft} brandName={brandName} />
      <MatchingPreviewCard preview={preview} />
      <InfluencerViewCard brandName={brandName} matches={preview.topMatches} />

      <div className="flex flex-col items-center gap-3 pt-2">
        <div className="flex flex-wrap justify-center gap-3">
          <Button href={editHref} variant="outline">
            Edit Campaign
          </Button>
          <Button
            type="button"
            onClick={() => void handlePost(draft)}
            disabled={posting}
            className="disabled:cursor-not-allowed disabled:opacity-60"
          >
            {posting ? "Posting…" : "Post Your Campaign Now"}
          </Button>
        </div>
        {postError && (
          <p className="text-sm font-medium text-danger" role="alert">
            {postError}
          </p>
        )}
      </div>
    </div>
  );
}
