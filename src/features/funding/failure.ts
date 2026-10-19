import { ApiError, UpstreamContractError, UpstreamUnavailableError } from "@/lib/api/errors";
import { fundErrorsFromDetails } from "./mapping";
import type { FundErrors } from "./mapping";

/** How a funding operation can fail, as the browser sees it. Nothing here carries tokens, cookies, bodies, provider data or stack traces. */
export type FundFailure =
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message: string }
  | { kind: "not_found" }
  | { kind: "conflict"; code: string; message: string }
  | { kind: "validation"; fields: FundErrors; message: string | null }
  | { kind: "rate_limited"; retryAfterSeconds: number | null }
  | { kind: "payments_unavailable" }
  | { kind: "unavailable"; requestId: string | null };

const CONFLICT_MESSAGES: Record<string, string> = {
  offer_not_fundable: "This booking can't be paid right now. Only a booking the creator accepted can be paid.",
  already_funded: "This booking has already been paid.",
  funding_deadline_passed: "The deadline to pay for this booking has passed.",
  funding_expired: "This booking was not paid in time, so it lapsed.",
  funding_in_progress: "A payment for this booking is already in progress. Wait for its result before starting another.",
  creator_not_active: "The creator's account is not active, so this booking can't be paid right now.",
  idempotency_key_reused: "That payment request was already used with different details. Please start the payment again.",
  brand_not_active: "Your account must be active to pay.",
};

const VALIDATION_CODES = new Set(["validation_failed", "amount_out_of_range", "amount_outside_provider_limits", "payment_method_not_supported"]);

const VALIDATION_TEXT: Record<string, string> = {
  amount_out_of_range: "This booking's price is outside the range that can be paid through the platform (10,000 to 50,000,000 CFA).",
  amount_outside_provider_limits: "This booking's price is outside what the payment provider allows.",
  payment_method_not_supported: "That payment method isn't available right now. Choose the other one.",
};

export function fundFailureFrom(error: unknown): FundFailure {
  if (error instanceof ApiError) {
    if (error.status === 401) return { kind: "unauthenticated" };
    if (error.status === 403 && (error.code === "brand_not_active" || error.code === "account_not_active")) return { kind: "conflict", code: "brand_not_active", message: CONFLICT_MESSAGES.brand_not_active as string };
    if (error.status === 403) return { kind: "forbidden", message: error.message };
    if (error.status === 404) return { kind: "not_found" };
    if (error.status === 429) return { kind: "rate_limited", retryAfterSeconds: error.retryAfterSeconds };
    if (error.status === 503 && error.code === "payments_unavailable") return { kind: "payments_unavailable" };
    if (error.status === 409) return { kind: "conflict", code: error.code, message: CONFLICT_MESSAGES[error.code] ?? error.message };
    if ((error.status === 422 || error.status === 400) && VALIDATION_CODES.has(error.code)) {
      return { kind: "validation", fields: fundErrorsFromDetails(error.details), message: VALIDATION_TEXT[error.code] ?? null };
    }
    return { kind: "unavailable", requestId: error.requestId };
  }
  if (!(error instanceof UpstreamUnavailableError) && !(error instanceof UpstreamContractError)) {
    console.error("[funding] unexpected error", error instanceof Error ? error.name : "unknown");
  }
  return { kind: "unavailable", requestId: null };
}

export interface FailureNotice {
  text: string;
  link?: { href: string; label: string };
}

/**
 * Plain text for each failure. When a request did not get a clear answer (`unavailable`), the text does NOT say nothing was charged: the request may have
 * reached the provider, so the person is told to check the status instead of paying again.
 */
export function fundFailureNotice(failure: FundFailure, returnTo: string): FailureNotice {
  const back = { href: "/brand/offers", label: "Back to my hires" };
  switch (failure.kind) {
    case "unauthenticated":
      return { text: "Your session has ended. If you just sent a payment request, check its status after signing in before paying again.", link: { href: `/sign-in?next=${encodeURIComponent(returnTo)}&expired=1`, label: "Sign in again" } };
    case "forbidden":
      return { text: `${failure.message} Nothing was charged.` };
    case "not_found":
      return { text: "We couldn't find that booking. Nothing was charged.", link: back };
    case "conflict":
      return { text: `${failure.message} Nothing new was charged.`, link: back };
    case "validation":
      return { text: `${failure.message ?? "Some details need fixing."} Nothing was charged.` };
    case "rate_limited":
      return { text: `Too many attempts. Nothing was charged. Please wait ${failure.retryAfterSeconds ? `about ${Math.max(1, Math.ceil(failure.retryAfterSeconds / 60))} minute(s)` : "a few minutes"} and try again.` };
    case "payments_unavailable":
      return { text: "Payments are not available right now. Nothing was charged. Please try again later." };
    case "unavailable":
      return { text: `We couldn't get a clear answer from the service. Your payment request may or may not have been received: use “Check status” before paying again. Retrying with this same form is safe: it can't charge you twice.${failure.requestId ? ` (Reference: ${failure.requestId})` : ""}` };
  }
}
