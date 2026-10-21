import { ApiError, UpstreamContractError, UpstreamUnavailableError } from "@/lib/api/errors";
import { adminFailureNotice } from "@/features/admin/failure";
import type { AdminFailure, FailureNotice } from "@/features/admin/failure";

/** How a payment operation can fail, as the browser sees it. Same shape as the admin failures; nothing here carries tokens, bodies or stack traces. */
export type PaymentFailure = AdminFailure;
export type { FailureNotice };

/** Plain-language text for the API's 403/409 codes (its own messages name raw statuses). */
const MESSAGES: Record<string, string> = {
  delivery_already_reported: "A delivery report was already submitted for this payment. It can't be changed.",
  payment_already_released: "This payment has already been released.",
  delivery_not_reported: "The creator has not reported the delivery yet.",
  delivery_disputed: "This delivery is under dispute.",
  already_acknowledged: "You already acknowledged this delivery.",
  delivery_acknowledged: "You acknowledged this delivery, so it can no longer be disputed.",
  dispute_exists: "A dispute already exists for this payment.",
  dispute_window_closed: "The period to dispute this delivery has ended.",
  no_open_dispute: "There is no open dispute to withdraw.",
  refund_request_exists: "A refund review was already requested for this payment.",
  refund_request_not_available: "A refund review can only be requested for a payment that is still held with nothing delivered.",
  refund_request_too_early: "A refund review can be requested only after the grace period that follows the engagement.",
  refund_request_closed: "This request was already decided or withdrawn.",
  withdrawal_not_cancellable: "This withdrawal can no longer be cancelled.",
  idempotency_key_reused: "That withdrawal request was already used with different details. Please start again.",
  profile_required: "You need an approved creator profile to withdraw.",
  account_not_active: "Your account must be active to do this.",
  brand_not_active: "Your account must be active to do this.",
  creator_not_active: "Your account must be active to do this.",
};

export function paymentFailureFrom(error: unknown): PaymentFailure {
  if (error instanceof ApiError) {
    if (error.status === 401) return { kind: "unauthenticated" };
    if (error.status === 403) {
      const message = MESSAGES[error.code];
      return message ? { kind: "conflict", code: error.code, message } : { kind: "forbidden", message: "You don't have permission to do this." };
    }
    if (error.status === 404) return { kind: "not_found" };
    if (error.status === 429) return { kind: "rate_limited", retryAfterSeconds: error.retryAfterSeconds };
    if (error.status === 409) return { kind: "conflict", code: error.code, message: MESSAGES[error.code] ?? "This can't be done in the current state. Reload the page to see the latest." };
    if (error.status === 422 || error.status === 400) {
      const detail = error.details[0]?.message;
      return { kind: "validation", message: detail ? `Please check the details: ${detail}.` : "Please check the details and try again." };
    }
    return { kind: "unavailable", requestId: error.requestId };
  }
  if (!(error instanceof UpstreamUnavailableError) && !(error instanceof UpstreamContractError)) {
    console.error("[payments] unexpected error", error instanceof Error ? error.name : "unknown");
  }
  return { kind: "unavailable", requestId: null };
}

export function paymentFailureNotice(failure: PaymentFailure, returnTo: string): FailureNotice {
  return adminFailureNotice(failure, returnTo);
}
