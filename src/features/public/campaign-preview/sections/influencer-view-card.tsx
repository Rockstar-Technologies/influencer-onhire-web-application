"use client";

import { useState } from "react";
import { Button } from "@/components/shared/button";
import type { MatchedInfluencer } from "@/types/campaign";
import { joinWithAmpersand } from "../preview-format";

type Response = "idle" | "accepted" | "declined";

// Lets the brand try both outcomes an influencer can choose, without sending anything.
export function InfluencerViewCard({ brandName, matches }: { brandName: string; matches: MatchedInfluencer[] }) {
  const [response, setResponse] = useState<Response>("idle");
  const [first, ...others] = matches;
  const influencerName = first?.name ?? "The influencer";

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="text-base font-bold text-heading">Influencer View — Accept or Decline</h2>
      <p className="mt-2 text-sm text-body">
        Active influencers with no conflicting brand deals will see this exact card, along with Accept and Decline
        buttons.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" onClick={() => setResponse("accepted")} disabled={response !== "idle"} className="disabled:opacity-60">
          Accept Campaign
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setResponse("declined")}
          disabled={response !== "idle"}
          className="disabled:opacity-60"
        >
          Decline
        </Button>
      </div>

      <div aria-live="polite">
        {response === "accepted" && (
          <p className="mt-4 rounded-xl bg-success/10 px-4 py-3 text-sm text-success">
            Example: {influencerName} accepts. {brandName} is notified right away and asked to fund the campaign into
            escrow before work starts.
          </p>
        )}
        {response === "declined" && (
          <p className="mt-4 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
            Example: {influencerName} declines. {brandName} receives a polite auto-message
            {others.length > 0 && <> and we suggest {joinWithAmpersand(others.map((match) => match.name))} instead</>}.
          </p>
        )}
        {response !== "idle" && (
          <button
            type="button"
            onClick={() => setResponse("idle")}
            className="mt-2 text-xs font-semibold text-primary hover:text-primary-hover"
          >
            Try the other response
          </button>
        )}
      </div>

      <p className="mt-4 text-xs text-muted">
        If declined, the brand receives a polite auto-message and we suggest other matching influencers.
      </p>
    </section>
  );
}
