import type { AuthFailure } from "./result";

/** User-facing text for each failure. Fixed strings only; upstream messages are shown only for account-blocked notices from the API. */
export function authFailureMessage(failure: AuthFailure): string {
  switch (failure.kind) {
    case "invalid_credentials":
      return "Email or password is incorrect. Check them and try again.";
    case "email_taken":
      return "An account with this email already exists.";
    case "account_blocked":
      return failure.message;
    case "validation": {
      const first = Object.values(failure.fieldErrors).find(Boolean);
      return first ? `Please check your details: ${first}` : "Please check your details and try again.";
    }
    case "rate_limited": {
      const seconds = failure.retryAfterSeconds;
      if (seconds === null) return "Too many attempts. Please wait a few minutes and try again.";
      const minutes = Math.max(1, Math.ceil(seconds / 60));
      return `Too many attempts. Please try again in about ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
    }
    case "unavailable":
      return failure.requestId
        ? `We couldn't reach the service. Please try again. (Reference: ${failure.requestId})`
        : "We couldn't reach the service. Check your connection and try again.";
  }
}
