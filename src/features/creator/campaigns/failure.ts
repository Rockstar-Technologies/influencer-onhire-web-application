import { ApiError } from "@/lib/api/errors";
import { offerFailureFrom, offerFailureNotice } from "@/features/offers/failure";
import type { FailureNotice, OfferFailure } from "@/features/offers/failure";
import { applyErrorsFromDetails } from "./query";
import type { ApplyErrors } from "./query";

export type ApplyFailure = Exclude<OfferFailure, { kind: "validation" }> | { kind: "validation"; fields: ApplyErrors; message: string | null };

const CONFLICT: Record<string, string> = {
  offer_already_exists: "You have already applied to this campaign. Each creator can apply once, and a withdrawn or declined application can't be sent again.",
  offer_not_pending: "That application has already been answered or has closed, so it can't be withdrawn.",
  offer_not_withdrawable: "Only an application you sent can be withdrawn here.",
};
const VALIDATION_TEXT: Record<string, string> = {
  price_below_minimum: "That price is below the platform's minimum price for a platform rate.",
  price_exceeds_budget: "That price is above the brand's maximum per creator.",
  engagement_below_minimum: "Your engagement rate is below this campaign's minimum (or you haven't shared one), so you can't apply.",
  invalid_platform: "That platform isn't one of yours.",
};

/** Errors of applying and withdrawing, in plain language; anything else is mapped by the shared offer failures. */
export function applyFailureFrom(error: unknown): ApplyFailure {
  if (error instanceof ApiError) {
    if (error.status === 409 && CONFLICT[error.code]) return { kind: "conflict", code: error.code, message: CONFLICT[error.code] as string };
    if (error.status === 403 && error.code === "profile_required") return { kind: "conflict", code: error.code, message: "You need an approved creator profile to apply." };
    if (error.status === 422) return { kind: "validation", fields: applyErrorsFromDetails(error.details), message: VALIDATION_TEXT[error.code] ?? null };
  }
  const generic = offerFailureFrom(error);
  return generic.kind === "validation" ? { kind: "validation", fields: {}, message: generic.message } : generic;
}

export function applyFailureNotice(failure: ApplyFailure, returnTo: string): FailureNotice {
  const back = { href: "/creator/campaigns", label: "Back to campaigns" };
  if (failure.kind === "validation") return { text: `${failure.message ?? "Some details need fixing."} Nothing was sent.` };
  if (failure.kind === "not_found") return { text: "This campaign is no longer open for applications, or it doesn't exist. Nothing was sent.", link: back };
  return offerFailureNotice(failure, returnTo, back);
}
