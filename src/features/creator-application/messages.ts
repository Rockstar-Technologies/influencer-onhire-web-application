import type { WizardFailure } from "./failure";

export interface FailureNotice {
  text: string;
  /** A link the person can follow to recover (for example to sign in again). */
  link?: { href: string; label: string };
}

/**
 * Plain-language text for each failure. Every message that follows a failed save says that nothing was saved: the wizard must never leave
 * the impression that data reached the server when it did not.
 */
export function failureNotice(failure: WizardFailure, returnTo: string, options: { ratesSaved?: boolean } = {}): FailureNotice {
  const saved = options.ratesSaved ? "Your rates and payment details were saved, but the application was not submitted. " : "Nothing was saved. ";
  switch (failure.kind) {
    case "unauthenticated":
      return {
        text: "Your session has ended, so your changes were not saved. Sign in again to carry on; anything you already saved is still there.",
        link: { href: `/sign-in?next=${encodeURIComponent(returnTo)}&expired=1`, label: "Sign in again" },
      };
    case "forbidden":
      return { text: `${failure.message} Nothing was saved.` };
    case "not_editable":
      return { text: "This application can no longer be edited because it has been submitted. Nothing was changed.", link: { href: "/for-creators/apply/submitted", label: "See your application" } };
    case "prerequisite":
      return { text: failure.message, link: { href: `/for-creators/apply/${failure.step}`, label: "Go to that step" } };
    case "validation":
      return { text: `${failure.message ?? "Some details need fixing."} ${saved}`.trim() };
    case "rate_limited":
      return { text: `Too many attempts. ${saved}Please wait ${failure.retryAfterSeconds ? `about ${Math.max(1, Math.ceil(failure.retryAfterSeconds / 60))} minute(s)` : "a few minutes"} and try again.` };
    case "unavailable":
      return { text: `We couldn't reach the service. ${saved}Please check your connection and try again.${failure.requestId ? ` (Reference: ${failure.requestId})` : ""}` };
  }
}

/** First server-side error for a field, matching `prices.instagram`-style keys by prefix too (for example `platforms` also covers `platforms.0.handle`). */
export function fieldError(fields: Record<string, string>, key: string): string | undefined {
  if (fields[key]) return fields[key];
  const nested = Object.keys(fields).find((name) => name.startsWith(`${key}.`));
  return nested ? fields[nested] : undefined;
}
