"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getCreatorWorkload, listCampaignRequests, respondToCampaignRequest } from "@/services/creator.service";
import type { CampaignRequest, CreatorWorkload } from "@/types/campaign-request";
import { PendingRequestCard } from "./pending-request-card";
import { RequestHistory } from "./request-history";

function matches(request: CampaignRequest, needle: string) {
  return (
    request.campaignTitle.toLowerCase().includes(needle) ||
    request.brandName.toLowerCase().includes(needle) ||
    request.niche.toLowerCase().includes(needle)
  );
}

export function CampaignRequestsBoard({
  query,
  initialRequests,
  initialWorkload,
  declineReasons,
}: {
  query: string;
  initialRequests: CampaignRequest[];
  initialWorkload: CreatorWorkload;
  declineReasons: string[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [workload, setWorkload] = useState(initialWorkload);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const busy = workload.activeCampaigns >= workload.maxActiveCampaigns;
  const needle = query.trim().toLowerCase();
  const visible = needle ? requests.filter((request) => matches(request, needle)) : requests;
  const pending = visible.filter((request) => request.status === "pending");
  const history = visible.filter((request) => request.status !== "pending");

  async function respond(request: CampaignRequest, response: "accepted" | "declined", declineReason?: string) {
    setRespondingId(request.id);
    setError(null);
    try {
      await respondToCampaignRequest({ requestId: request.id, response, declineReason });
      const [nextRequests, nextWorkload] = await Promise.all([listCampaignRequests(), getCreatorWorkload()]);
      setRequests(nextRequests);
      setWorkload(nextWorkload);
      setHighlightId(request.id);
      setToast(
        response === "accepted"
          ? `Accepted "${request.campaignTitle}". ${request.brandName} will fund escrow before you start.`
          : `Declined "${request.campaignTitle}". ${request.brandName} gets a polite auto-message.`
      );
    } catch {
      setError("We couldn't send your response. Check your connection and try again.");
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading sm:text-3xl">Campaign Requests</h1>
          <p className="mt-2 text-sm text-muted sm:text-base">
            Review new brand campaigns and accept the ones that fit your schedule.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            busy ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {busy
            ? `Busy — ${workload.activeCampaigns} active campaigns`
            : `Available — ${workload.activeCampaigns} of ${workload.maxActiveCampaigns} active campaigns`}
        </span>
      </div>

      {needle && (
        <p className="-mt-2 text-sm text-body">
          {visible.length} result{visible.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo; ·{" "}
          <Link href="/creator/requests" className="font-semibold text-primary hover:text-primary-hover">
            Clear search
          </Link>
        </p>
      )}

      {error && (
        <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}

      {pending.length > 0 ? (
        pending.map((request) => (
          <PendingRequestCard
            key={request.id}
            request={request}
            busy={busy}
            activeCampaigns={workload.activeCampaigns}
            declineReasons={declineReasons}
            responding={respondingId === request.id}
            onAccept={() => void respond(request, "accepted")}
            onDecline={(reason) => void respond(request, "declined", reason)}
          />
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
          <p className="font-semibold text-heading">{needle ? "No new requests match your search" : "You're all caught up"}</p>
          <p className="mt-1 text-sm text-muted">
            {needle ? "Try a brand or campaign name." : "New campaign requests that match your profile will appear here."}
          </p>
        </div>
      )}

      <RequestHistory requests={history} highlightId={highlightId} />

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[70] max-w-sm rounded-xl bg-heading px-4 py-3 text-sm text-white shadow-2xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
