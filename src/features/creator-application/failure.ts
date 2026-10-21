import { ApiError, UpstreamContractError, UpstreamUnavailableError } from "@/lib/api/errors";
import { fieldErrorsFromDetails, stepsWithErrors } from "./mapping";
import type { WizardStep } from "./mapping";

/** How a wizard operation can fail, as the browser sees it. No tokens, cookies, bodies or stack traces ever travel in these. */
export type WizardFailure =
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message: string }
  | { kind: "not_editable"; message: string }
  | { kind: "prerequisite"; step: WizardStep; message: string }
  | { kind: "validation"; fields: Record<string, string>; steps: WizardStep[]; message: string | null }
  | { kind: "rate_limited"; retryAfterSeconds: number | null }
  | { kind: "unavailable"; requestId: string | null };

/** API error codes that mean "the data you sent is not acceptable" and whose message is written for the applicant. */
const VALIDATION_CODES = new Set([
  "validation_failed",
  "application_incomplete",
  "followers_below_minimum",
  "price_below_minimum",
  "prices_must_match_platforms",
  "invalid_photo",
  "invalid_reference",
]);

export function wizardFailureFrom(error: unknown, step?: WizardStep): WizardFailure {
  if (error instanceof ApiError) {
    if (error.status === 401) return { kind: "unauthenticated" };
    if (error.status === 403) return { kind: "forbidden", message: error.message };
    if (error.status === 429) return { kind: "rate_limited", retryAfterSeconds: error.retryAfterSeconds };
    if (error.status === 409 && error.code === "audience_required") {
      return { kind: "prerequisite", step: "audience", message: "Save your audience (step 2) before setting your rates." };
    }
    if (error.status === 409 && ["application_not_editable", "no_open_application", "already_submitted"].includes(error.code)) {
      return { kind: "not_editable", message: error.message };
    }
    if (error.status === 422 && VALIDATION_CODES.has(error.code)) {
      const fields = fieldErrorsFromDetails(error.details, step);
      const general = error.code === "validation_failed" || error.code === "application_incomplete" ? null : error.message;
      return { kind: "validation", fields, steps: stepsWithErrors(error.details), message: general };
    }
    return { kind: "unavailable", requestId: error.requestId };
  }
  // Upstream outages, malformed answers and any configuration/programming error all fail closed as "unavailable".
  if (!(error instanceof UpstreamUnavailableError) && !(error instanceof UpstreamContractError)) {
    console.error("[creator-application] unexpected error", error instanceof Error ? error.name : "unknown");
  }
  return { kind: "unavailable", requestId: null };
}

export type WizardResult<T> = { ok: true; value: T } | { ok: false; error: WizardFailure };
