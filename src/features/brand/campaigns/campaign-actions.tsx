"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { transitionCampaignAction } from "@/features/brand-campaigns/actions";
import { campaignFailureNotice } from "@/features/brand-campaigns/failure";
import type { FailureNotice } from "@/features/brand-campaigns/failure";
import type { CampaignStatus } from "@/lib/domain/vocabulary";

type Kind = "submit" | "cancel" | "delete";

const CONFIRM: Record<Exclude<Kind, "submit">, string> = {
  cancel: "Withdraw this campaign? It will be cancelled and cannot be reopened; you can post a new one.",
  delete: "Delete this draft? This cannot be undone.",
};

/**
 * The lifecycle actions the API permits for the campaign's CURRENT status: submit or delete a draft; cancel a submitted or open campaign.
 * The buttons only reflect what the API allows; the API re-checks the state and ownership and answers 409 if it changed.
 */
export function CampaignActions({ id, status }: { id: string; status: CampaignStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Kind | null>(null);
  const [notice, setNotice] = useState<FailureNotice | null>(null);
  const inFlight = useRef(false);

  async function run(kind: Kind) {
    if (inFlight.current) return;
    if (kind !== "submit" && !window.confirm(CONFIRM[kind])) return;
    inFlight.current = true;
    setBusy(kind);
    setNotice(null);
    try {
      const result = await transitionCampaignAction({ id, kind });
      if (result.ok) {
        if (result.deleted) router.push("/brand/campaigns");
        else router.refresh();
        // keep the lock until the new state is rendered; the buttons for the old state disappear with the refresh
        inFlight.current = false;
        setBusy(null);
        return;
      }
      setNotice(campaignFailureNotice(result.error, `/brand/campaigns/${id}`));
      if (result.error.kind === "conflict") router.refresh(); // the state moved: show the real one
    } catch {
      setNotice(campaignFailureNotice({ kind: "unavailable", requestId: null }, `/brand/campaigns/${id}`));
    }
    inFlight.current = false;
    setBusy(null);
  }

  const canEdit = status === "draft";
  const canCancel = status === "pending_review" || status === "open";
  if (!canEdit && !canCancel) return <p className="text-sm text-muted">This campaign can no longer be changed here.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {canEdit && (
          <>
            <Link href={`/campaigns/new?draft=${id}`} className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-heading hover:bg-surface-alt">
              Edit draft
            </Link>
            <button type="button" disabled={busy !== null} onClick={() => void run("submit")} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {busy === "submit" ? "Submitting…" : "Submit for review"}
            </button>
            <button type="button" disabled={busy !== null} onClick={() => void run("delete")} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-danger hover:bg-danger-light disabled:cursor-not-allowed disabled:opacity-60">
              {busy === "delete" ? "Deleting…" : "Delete draft"}
            </button>
          </>
        )}
        {canCancel && (
          <button type="button" disabled={busy !== null} onClick={() => void run("cancel")} className="rounded-lg border border-danger/40 px-5 py-2.5 text-sm font-semibold text-danger hover:bg-danger-light disabled:cursor-not-allowed disabled:opacity-60">
            {busy === "cancel" ? "Cancelling…" : status === "open" ? "Cancel campaign" : "Withdraw from review"}
          </button>
        )}
      </div>
      {notice && (
        <p role="alert" className="rounded-lg bg-danger-light px-4 py-3 text-sm text-danger">
          {notice.text}
          {notice.link && (
            <>
              {" "}
              <Link href={notice.link.href} className="font-semibold underline">
                {notice.link.label}
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
