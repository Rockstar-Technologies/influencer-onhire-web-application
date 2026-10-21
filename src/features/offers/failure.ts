import { ApiError, UpstreamContractError, UpstreamUnavailableError } from "@/lib/api/errors";
import { hireErrorsFromDetails } from "./mapping";
import type { HireFormErrors } from "./mapping";

/** How an offer operation can fail, as the browser sees it. Nothing here carries tokens, cookies, bodies or stack traces. */
export type OfferFailure =
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message: string }
  | { kind: "not_found" }
  | { kind: "conflict"; code: string; message: string }
  | { kind: "validation"; fields: HireFormErrors; message: string | null }
  | { kind: "rate_limited"; retryAfterSeconds: number | null }
  | { kind: "unavailable"; requestId: string | null };

/** Plain-language text for the API's 409 codes (the API's own messages name raw statuses and internals). */
const CONFLICT_MESSAGES: Record<string, string> = {
  hire_already_pending: "You already have a pending request to this creator. You can send another once they answer, or cancel the pending one.",
  offer_not_pending: "This request has already been answered or has closed, so it can't be changed.",
  offer_not_respondable: "This is your own application, so it can't be answered here.",
  offer_not_decidable: "This offer can't be decided by you.",
  offer_not_cancellable: "Only a pending direct hire can be cancelled.",
  hire_expired: "This hire request has expired (hire requests can be answered for 7 days).",
  campaign_not_open: "This campaign is no longer open for new engagements.",
  brand_not_active: "The brand's account is not active, so this can't be accepted right now.",
  creator_not_active: "The creator's account is not active, so this can't be accepted right now.",
  creator_capacity_exceeded: "You already have the maximum number of overlapping engagements for these dates. Choose other dates or finish an engagement first.",
  duration_below_minimum: "This creator's minimum booking is longer than the duration you chose.",
};

const VALIDATION_CODES = new Set([
  "validation_failed",
  "invalid_reference",
  "invalid_platform",
  "payment_method_not_accepted",
  "duration_below_minimum",
  "start_date_not_allowed",
  "start_date_too_far",
  "start_date_in_past",
]);

export function offerFailureFrom(error: unknown): OfferFailure {
  if (error instanceof ApiError) {
    if (error.status === 401) return { kind: "unauthenticated" };
    if (error.status === 403 && (error.code === "brand_not_active" || error.code === "account_not_active")) {
      return { kind: "conflict", code: error.code, message: CONFLICT_MESSAGES.brand_not_active as string };
    }
    if (error.status === 403) return { kind: "forbidden", message: error.message };
    if (error.status === 404) return { kind: "not_found" };
    if (error.status === 429) return { kind: "rate_limited", retryAfterSeconds: error.retryAfterSeconds };
    if (error.status === 409) return { kind: "conflict", code: error.code, message: CONFLICT_MESSAGES[error.code] ?? error.message };
    if (error.status === 422 && VALIDATION_CODES.has(error.code)) {
      const fields = hireErrorsFromDetails(error.details);
      const generic = error.code === "validation_failed" || error.code === "invalid_reference";
      return { kind: "validation", fields, message: generic ? null : error.message };
    }
    return { kind: "unavailable", requestId: error.requestId };
  }
  if (!(error instanceof UpstreamUnavailableError) && !(error instanceof UpstreamContractError)) {
    console.error("[offers] unexpected error", error instanceof Error ? error.name : "unknown");
  }
  return { kind: "unavailable", requestId: null };
}

export interface FailureNotice {
  text: string;
  link?: { href: string; label: string };
}

/** Plain-language text for each failure. A failed action always says nothing was changed. */
export function offerFailureNotice(failure: OfferFailure, returnTo: string, backTo: { href: string; label: string }): FailureNotice {
  switch (failure.kind) {
    case "unauthenticated":
      return {
        text: "Your session has ended, so nothing was changed. Sign in again to carry on.",
        link: { href: `/sign-in?next=${encodeURIComponent(returnTo)}&expired=1`, label: "Sign in again" },
      };
    case "forbidden":
      return { text: `${failure.message} Nothing was changed.` };
    case "not_found":
      return { text: "We couldn't find that request. It may no longer exist. Nothing was changed.", link: backTo };
    case "conflict":
      return { text: `${failure.message} Nothing was changed.`, link: failure.code === "hire_already_pending" ? { href: "/brand/offers", label: "See my hire requests" } : backTo };
    case "validation":
      return { text: `${failure.message ?? "Some details need fixing."} Nothing was sent.` };
    case "rate_limited":
      return { text: `Too many attempts. Nothing was changed. Please wait ${failure.retryAfterSeconds ? `about ${Math.max(1, Math.ceil(failure.retryAfterSeconds / 60))} minute(s)` : "a few minutes"} and try again.` };
    case "unavailable":
      return { text: `We couldn't reach the service. Nothing was changed. Please check your connection and try again.${failure.requestId ? ` (Reference: ${failure.requestId})` : ""}` };
  }
}
