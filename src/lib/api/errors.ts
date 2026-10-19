/**
 * Errors raised by the server-only API client. Messages are fixed, safe strings: they never include upstream bodies, headers,
 * cookies or credentials, so an error can be logged or rendered without leaking anything.
 */
export interface ApiErrorDetail {
  path: string;
  message: string;
  code?: string;
}

/** The API answered with an error status. `code` is the API's stable error code (for example `invalid_credentials`). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;
  readonly details: readonly ApiErrorDetail[];
  readonly retryAfterSeconds: number | null;

  constructor(input: {
    status: number;
    code: string;
    message: string;
    requestId?: string | null;
    details?: readonly ApiErrorDetail[];
    retryAfterSeconds?: number | null;
  }) {
    super(input.message);
    this.name = "ApiError";
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId ?? null;
    this.details = input.details ?? [];
    this.retryAfterSeconds = input.retryAfterSeconds ?? null;
  }
}

/** The API could not be reached or did not answer in time. */
export class UpstreamUnavailableError extends Error {
  readonly reason: "timeout" | "network";

  constructor(reason: "timeout" | "network") {
    super(reason === "timeout" ? "The service did not respond in time" : "The service could not be reached");
    this.name = "UpstreamUnavailableError";
    this.reason = reason;
  }
}

/** The API answered, but not with the documented shape (or too much data). The body is deliberately not kept. */
export class UpstreamContractError extends Error {
  constructor(message = "The service returned an unexpected response") {
    super(message);
    this.name = "UpstreamContractError";
  }
}

/** Required server configuration is missing or invalid. Raised instead of falling back to a guessed value. */
export class ApiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiConfigError";
  }
}
