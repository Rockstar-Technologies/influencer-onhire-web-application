"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { decideOfferAction } from "../actions";
import { offerFailureNotice } from "../failure";
import type { FailureNotice } from "../failure";
import type { OfferKind } from "../mapping";
import type { OfferStatus } from "@/lib/domain/vocabulary";

type Kind = "accept" | "decline" | "cancel";
const BACK = { href: "/brand/offers", label: "Back to my hires" };

const CONFIRM: Record<Kind, string> = {
  accept: "Accept this creator's application? They will be booked for your campaign's dates at the price shown.",
  decline: "Decline this application?",
  cancel: "Cancel this hire request? The creator will no longer be able to accept it.",
};

/**
 * What the API permits for this offer: a brand can cancel its own PENDING direct hire, and accept or decline a PENDING creator application.
 * Platform invitations are answered by the creator only, and every other state is final. The API re-checks the state and the owner.
 */
export function BrandOfferActions({ id, status, kind }: { id: string; status: OfferStatus; kind: OfferKind }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Kind | null>(null);
  const [notice, setNotice] = useState<FailureNotice | null>(null);
  const inFlight = useRef(false);

  async function run(action: Kind) {
    if (inFlight.current) return;
    if (!window.confirm(CONFIRM[action])) return;
    inFlight.current = true;
    setBusy(action);
    setNotice(null);
    try {
      const result = await decideOfferAction({ id, kind: action });
      if (result.ok) {
        router.refresh();
        return;
      }
      setNotice(offerFailureNotice(result.error, "/brand/offers", BACK));
      if (result.error.kind === "conflict" || result.error.kind === "not_found") router.refresh(); // the state moved: show the real one
    } catch {
      setNotice(offerFailureNotice({ kind: "unavailable", requestId: null }, "/brand/offers", BACK));
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  const canCancel = status === "pending" && kind === "direct_hire";
  const canDecide = status === "pending" && kind === "application";
  if (!canCancel && !canDecide) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-3">
        {canDecide && (
          <>
            <button type="button" disabled={busy !== null} onClick={() => void run("accept")} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {busy === "accept" ? "Accepting…" : "Accept application"}
            </button>
            <button type="button" disabled={busy !== null} onClick={() => void run("decline")} className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-heading hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60">
              {busy === "decline" ? "Declining…" : "Decline"}
            </button>
          </>
        )}
        {canCancel && (
          <button type="button" disabled={busy !== null} onClick={() => void run("cancel")} className="rounded-lg border border-danger/40 px-5 py-2.5 text-sm font-semibold text-danger hover:bg-danger-light disabled:cursor-not-allowed disabled:opacity-60">
            {busy === "cancel" ? "Cancelling…" : "Cancel request"}
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
