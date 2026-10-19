import { ApiError, UpstreamContractError, UpstreamUnavailableError } from "@/lib/api/errors";

/** How an administrator's operation can fail, as the browser sees it. Nothing here carries tokens, cookies, bodies or stack traces. */
export type AdminFailure =
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message: string }
  | { kind: "not_found" }
  | { kind: "conflict"; code: string; message: string }
  | { kind: "validation"; message: string }
  | { kind: "rate_limited"; retryAfterSeconds: number | null }
  | { kind: "unavailable"; requestId: string | null };

/** Plain-language text for the API's 409/403 codes (its own messages name raw statuses and internals). */
const MESSAGES: Record<string, string> = {
  invalid_state_transition: "This account's status doesn't allow that change any more. It may already have been changed.",
  creator_not_approved: "This creator has no approved profile yet, so the account can't be reactivated.",
  last_super_admin: "The last active Super Admin can't be suspended.",
  cannot_modify_self: "You can't change your own account.",
  insufficient_permissions: "Only a Super Admin can change another administrator's account.",
  application_not_under_review: "This application is not waiting for review any more.",
  account_not_pending: "The applicant's account is not pending, so the application can't be decided.",
  profile_exists: "This creator already has a live profile.",
  campaign_not_pending_review: "This campaign is not waiting for review any more.",
  release_not_yet_eligible: "This payment can't be released yet: the brand can still dispute the delivery. It can be released after the brand acknowledges delivery, the dispute window passes, or a dispute is dismissed.",
  delivery_not_reported: "The creator has not reported the delivery yet, so there is nothing to release.",
  payment_already_released: "This payment has already been released.",
  payment_disputed: "This payment is held back by a dispute and can't be released.",
  payment_refund_pending: "A refund of this payment is in progress, so it can't be released.",
  payment_refunded: "This payment was refunded, so it can't be released.",
  simulated_funds: "Simulated funds can't be released in production.",
  actor_not_active: "Your administrator account is not active.",
};

export function adminFailureFrom(error: unknown): AdminFailure {
  if (error instanceof ApiError) {
    if (error.status === 401) return { kind: "unauthenticated" };
    if (error.status === 403) {
      const message = MESSAGES[error.code];
      return message ? { kind: "conflict", code: error.code, message } : { kind: "forbidden", message: "You don't have permission to do this." };
    }
    if (error.status === 404) return { kind: "not_found" };
    if (error.status === 429) return { kind: "rate_limited", retryAfterSeconds: error.retryAfterSeconds };
    if (error.status === 409) return { kind: "conflict", code: error.code, message: MESSAGES[error.code] ?? "This can't be done in the current state. Reload the page to see the latest." };
    if (error.status === 422) return { kind: "validation", message: error.details[0]?.message ? `Please check the details: ${error.details[0].message}.` : "Please check the details and try again." };
    return { kind: "unavailable", requestId: error.requestId };
  }
  if (!(error instanceof UpstreamUnavailableError) && !(error instanceof UpstreamContractError)) {
    console.error("[admin] unexpected error", error instanceof Error ? error.name : "unknown");
  }
  return { kind: "unavailable", requestId: null };
}

export interface FailureNotice {
  text: string;
  link?: { href: string; label: string };
}

export function adminFailureNotice(failure: AdminFailure, returnTo: string): FailureNotice {
  switch (failure.kind) {
    case "unauthenticated":
      return { text: "Your session has ended, so nothing was changed. Sign in again to carry on.", link: { href: `/sign-in?next=${encodeURIComponent(returnTo)}&expired=1`, label: "Sign in again" } };
    case "forbidden":
      return { text: `${failure.message} Nothing was changed.` };
    case "not_found":
      return { text: "We couldn't find that record. Nothing was changed." };
    case "conflict":
      return { text: `${failure.message} Nothing was changed.` };
    case "validation":
      return { text: `${failure.message} Nothing was changed.` };
    case "rate_limited":
      return { text: `Too many actions. Nothing was changed. Please wait ${failure.retryAfterSeconds ? `about ${Math.max(1, Math.ceil(failure.retryAfterSeconds / 60))} minute(s)` : "a moment"} and try again.` };
    case "unavailable":
      return { text: `We couldn't get a clear answer from the service, so the change may or may not have been made. Reload the page to see the latest before trying again.${failure.requestId ? ` (Reference: ${failure.requestId})` : ""}` };
  }
}
