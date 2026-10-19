import { ApiError, UpstreamContractError, UpstreamUnavailableError } from "@/lib/api/errors";
import { fieldErrorsFromDetails } from "./mapping";
import type { CampaignFormErrors } from "./mapping";

/** How a campaign operation can fail, as the browser sees it. Nothing here carries tokens, cookies, bodies or stack traces. */
export type CampaignFailure =
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message: string }
  | { kind: "not_found" }
  | { kind: "conflict"; code: string; message: string }
  | { kind: "validation"; fields: CampaignFormErrors; message: string | null }
  | { kind: "rate_limited"; retryAfterSeconds: number | null }
  | { kind: "unavailable"; requestId: string | null };

/** Plain-language text for the API's 409 codes (the API's own messages name raw statuses such as `pending_review`). */
const CONFLICT_MESSAGES: Record<string, string> = {
  campaign_not_draft: "This campaign has already been submitted.",
  campaign_not_editable: "This campaign has already been submitted, so it can't be edited.",
  campaign_not_deletable: "Only a draft can be deleted. A submitted campaign can be cancelled instead.",
  campaign_not_cancellable: "This campaign can't be cancelled in its current state.",
  campaign_has_active_offers: "Creators have already responded to this campaign, so it can't be cancelled yet.",
  campaign_not_pending_review: "This campaign is no longer waiting for review.",
  brand_not_active: "Your account must be active to do this.",
};

const VALIDATION_CODES = new Set(["validation_failed", "invalid_reference", "budget_out_of_range", "start_date_in_past", "invalid_dates", "campaign_incomplete", "invalid_image"]);

export function campaignFailureFrom(error: unknown): CampaignFailure {
  if (error instanceof ApiError) {
    if (error.status === 401) return { kind: "unauthenticated" };
    if (error.status === 403 && error.code === "brand_not_active") return { kind: "conflict", code: error.code, message: CONFLICT_MESSAGES.brand_not_active as string };
    if (error.status === 403) return { kind: "forbidden", message: error.message };
    if (error.status === 404) return { kind: "not_found" };
    if (error.status === 429) return { kind: "rate_limited", retryAfterSeconds: error.retryAfterSeconds };
    if (error.status === 409) return { kind: "conflict", code: error.code, message: CONFLICT_MESSAGES[error.code] ?? error.message };
    if (error.status === 422 && VALIDATION_CODES.has(error.code)) {
      const fields = fieldErrorsFromDetails(error.details);
      const message = error.code === "validation_failed" || error.code === "invalid_reference" ? null : error.message;
      return { kind: "validation", fields, message };
    }
    return { kind: "unavailable", requestId: error.requestId };
  }
  if (!(error instanceof UpstreamUnavailableError) && !(error instanceof UpstreamContractError)) {
    console.error("[brand-campaigns] unexpected error", error instanceof Error ? error.name : "unknown");
  }
  return { kind: "unavailable", requestId: null };
}

export interface FailureNotice {
  text: string;
  link?: { href: string; label: string };
}

/** Plain-language text for each failure. A failed save always says nothing was saved (or exactly what was). */
export function campaignFailureNotice(failure: CampaignFailure, returnTo: string, context: { savedDraft?: boolean } = {}): FailureNotice {
  const saved = context.savedDraft ? "Your changes were saved as a draft, but the campaign was not submitted. " : "Nothing was saved. ";
  switch (failure.kind) {
    case "unauthenticated":
      return {
        text: "Your session has ended, so your changes were not saved. Sign in again to carry on; anything you already saved is still there.",
        link: { href: `/sign-in?next=${encodeURIComponent(returnTo)}&expired=1`, label: "Sign in again" },
      };
    case "forbidden":
      return { text: `${failure.message} Nothing was saved.` };
    case "not_found":
      return { text: "We couldn't find that campaign. It may have been deleted.", link: { href: "/brand/campaigns", label: "Back to my campaigns" } };
    case "conflict":
      return { text: `${failure.message} Nothing was changed.`, link: { href: "/brand/campaigns", label: "Back to my campaigns" } };
    case "validation":
      return { text: `${failure.message ?? "Some details need fixing."} ${saved}`.trim() };
    case "rate_limited":
      return { text: `Too many attempts. ${saved}Please wait ${failure.retryAfterSeconds ? `about ${Math.max(1, Math.ceil(failure.retryAfterSeconds / 60))} minute(s)` : "a few minutes"} and try again.` };
    case "unavailable":
      return { text: `We couldn't reach the service. ${saved}Please check your connection and try again.${failure.requestId ? ` (Reference: ${failure.requestId})` : ""}` };
  }
}
