"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { answerOfferAction } from "@/features/offers/actions";
import { offerFailureNotice } from "@/features/offers/failure";
import type { FailureNotice } from "@/features/offers/failure";
import { offerKind } from "@/features/offers/mapping";
import type { DeclineReason, OfferView } from "@/lib/api/schemas";
import { PendingRequestCard } from "./pending-request-card";
import type { Answer } from "./pending-request-card";
import { RequestHistory } from "./request-history";

const BACK = { href: "/creator/requests", label: "Back to requests" };

function matches(offer: OfferView, needle: string) {
  return [offer.campaign?.title, offer.brandName, offer.hire?.contactName, offer.reference].some((text) => text?.toLowerCase().includes(needle));
}

interface Props {
  query: string;
  pending: OfferView[];
  pendingTruncated: boolean;
  history: OfferView[];
  nextCursor: string | null;
  reasons: DeclineReason[];
}

export function RequestsBoard({ query, pending, pendingTruncated, history, nextCursor, reasons }: Props) {
  const router = useRouter();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [notice, setNotice] = useState<(FailureNotice & { id: string }) | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const needle = query.trim().toLowerCase();
  const visiblePending = needle ? pending.filter((offer) => matches(offer, needle)) : pending;
  const visibleHistory = needle ? history.filter((offer) => matches(offer, needle)) : history;

  async function respond(offer: OfferView, answer: Answer) {
    if (inFlight.current) return; // one answer at a time; a double click must not send two
    inFlight.current = true;
    setRespondingId(offer.id);
    setNotice(null);
    try {
      const result = await answerOfferAction({ id: offer.id, ...answer });
      if (result.ok) {
        setHighlightId(offer.id);
        setToast(answer.kind === "accept" ? `Accepted ${offer.reference}. ${offer.brandName ?? "The brand"} can now fund the booking.` : `Declined ${offer.reference}.`);
        router.refresh(); // show what the API now holds
        return;
      }
      setNotice({ id: offer.id, ...offerFailureNotice(result.error, "/creator/requests", BACK) });
      if (result.error.kind === "conflict" || result.error.kind === "not_found") router.refresh();
    } catch {
      setNotice({ id: offer.id, ...offerFailureNotice({ kind: "unavailable", requestId: null }, "/creator/requests", BACK) });
    } finally {
      inFlight.current = false;
      setRespondingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-heading sm:text-3xl">Campaign Requests</h1>
        <p className="mt-2 text-sm text-muted sm:text-base">Hire requests from brands and campaign invitations from the platform. Accept the ones that fit your schedule.</p>
      </div>

      {needle && (
        <p className="-mt-2 text-sm text-body">
          {visiblePending.length + visibleHistory.length} result{visiblePending.length + visibleHistory.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo; ·{" "}
          <Link href="/creator/requests" className="font-semibold text-primary hover:text-primary-hover">
            Clear search
          </Link>
        </p>
      )}

      {visiblePending.length > 0 ? (
        visiblePending.map((offer) => (
          <PendingRequestCard
            key={offer.id}
            offer={offer}
            kind={offerKind(offer)}
            reasons={reasons}
            responding={respondingId === offer.id}
            locked={respondingId !== null}
            notice={notice?.id === offer.id ? notice : null}
            onAnswer={(answer) => void respond(offer, answer)}
          />
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
          <p className="font-semibold text-heading">{needle ? "No new requests match your search" : "You're all caught up"}</p>
          <p className="mt-1 text-sm text-muted">{needle ? "Try a brand or campaign name." : "New hire requests and campaign invitations will appear here."}</p>
        </div>
      )}
      {pendingTruncated && !needle && <p className="text-sm text-muted">Showing your 50 newest waiting requests. Answer some to see the rest.</p>}

      <RequestHistory offers={visibleHistory} highlightId={highlightId} />

      {nextCursor && !needle && (
        <div className="text-center">
          <Link href={`/creator/requests?cursor=${encodeURIComponent(nextCursor)}`} className="inline-flex rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-heading hover:bg-surface-alt">
            Show more history
          </Link>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed bottom-6 right-6 z-[70] max-w-sm rounded-xl bg-heading px-4 py-3 text-sm text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
