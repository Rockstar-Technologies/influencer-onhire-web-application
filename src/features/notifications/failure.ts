import { ApiError, UpstreamContractError, UpstreamUnavailableError } from "@/lib/api/errors";

/** How a notification operation can fail, as the browser sees it. Nothing here carries tokens, cookies, bodies or stack traces. */
export type NotificationFailure =
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message: string }
  | { kind: "not_found" }
  | { kind: "rate_limited"; retryAfterSeconds: number | null }
  | { kind: "unavailable"; requestId: string | null };

export function notificationFailureFrom(error: unknown): NotificationFailure {
  if (error instanceof ApiError) {
    if (error.status === 401) return { kind: "unauthenticated" };
    if (error.status === 403) return { kind: "forbidden", message: error.message };
    if (error.status === 404) return { kind: "not_found" };
    if (error.status === 429) return { kind: "rate_limited", retryAfterSeconds: error.retryAfterSeconds };
    return { kind: "unavailable", requestId: error.requestId };
  }
  if (!(error instanceof UpstreamUnavailableError) && !(error instanceof UpstreamContractError)) {
    console.error("[notifications] unexpected error", error instanceof Error ? error.name : "unknown");
  }
  return { kind: "unavailable", requestId: null };
}

export interface FailureNotice {
  text: string;
  link?: { href: string; label: string };
}

export function notificationFailureNotice(failure: NotificationFailure, returnTo: string): FailureNotice {
  switch (failure.kind) {
    case "unauthenticated":
      return { text: "Your session has ended, so nothing was changed. Sign in again to carry on.", link: { href: `/sign-in?next=${encodeURIComponent(returnTo)}&expired=1`, label: "Sign in again" } };
    case "forbidden":
      return { text: `${failure.message} Nothing was changed.` };
    case "not_found":
      return { text: "We couldn't find that notification. Nothing was changed." };
    case "rate_limited":
      return { text: `Too many requests. Nothing was changed. Please wait ${failure.retryAfterSeconds ? `about ${Math.max(1, Math.ceil(failure.retryAfterSeconds / 60))} minute(s)` : "a moment"} and try again.` };
    case "unavailable":
      return { text: `We couldn't reach the service. Nothing was changed. Please try again.${failure.requestId ? ` (Reference: ${failure.requestId})` : ""}` };
  }
}
