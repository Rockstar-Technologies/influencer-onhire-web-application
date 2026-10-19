import "server-only";
import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import type { ApiConfig } from "./config";
import { getApiConfig } from "./config";
import { buildApiPath, buildApiQuery, isAllowedEndpoint, isSafeApiPath } from "./endpoints";
import type { Endpoint } from "./endpoints";
import { ApiConfigError, ApiError, UpstreamContractError, UpstreamUnavailableError } from "./errors";
import { errorBodySchema } from "./schemas";
import { isValidSessionToken, parseUpstreamSessionCookie } from "./session-cookie";
import type { UpstreamSessionCookie } from "./session-cookie";

export interface CallOptions {
  body?: unknown;
  /** The campaign (or other resource) UUID for operations whose path ends in `:id`. */
  params?: { id?: string };
  /** Query-string values; only the keys the operation lists are accepted. */
  query?: Record<string, string | number | undefined>;
  /** The user's session token (from this application's cookie). Sent only to endpoints that accept a session. */
  session?: string | null;
  /** The real client address, already resolved by resolveClientIp. */
  clientIp?: string | null;
}

export interface CallResult<TData> {
  data: TData;
  status: number;
  /** The session cookie the API set or cleared in this response, if any. */
  sessionCookie: UpstreamSessionCookie | null;
  requestId: string | null;
  /** The envelope's `meta` (for example the next page cursor), when the API sent one. */
  meta: Record<string, unknown> | null;
}

export interface ClientDependencies {
  config?: ApiConfig;
  fetchImpl?: typeof fetch;
  newRequestId?: () => string;
}

/** Reads at most `limit` bytes; a longer body is an error, so a misbehaving upstream cannot exhaust memory. */
async function readBounded(response: Response, limit: number): Promise<string> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) throw new UpstreamContractError("The service response was too large");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      void reader.cancel().catch(() => undefined); // stop reading; do not wait for the upstream to acknowledge
      throw new UpstreamContractError("The service response was too large");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  return Number.isInteger(seconds) && seconds >= 0 && seconds <= 86_400 ? seconds : null;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * The one way this application talks to the Express API. Server-only (the `server-only` import fails the build if a client
 * component imports this module). Behaviour:
 *  - only operations listed in endpoints.ts can be called; the URL is built from the configured base and the table's fixed path;
 *  - the session token goes into a Cookie header and nowhere else; it is never logged, returned in errors or placed in URLs;
 *  - fixed timeout, no redirects, no caching, bounded response size, schema-validated data;
 *  - upstream failures become ApiError / UpstreamUnavailableError / UpstreamContractError with fixed safe messages.
 */
export async function callApi<TData>(
  endpoint: Endpoint<TData>,
  options: CallOptions = {},
  dependencies: ClientDependencies = {},
): Promise<CallResult<TData>> {
  if (!isAllowedEndpoint(endpoint) || !isSafeApiPath(endpoint.path)) {
    throw new ApiConfigError("This API operation is not allowed");
  }
  const config = dependencies.config ?? getApiConfig();
  const doFetch = dependencies.fetchImpl ?? fetch;
  const requestId = (dependencies.newRequestId ?? randomUUID)();

  const url = new URL(`${config.baseUrl}${buildApiPath(endpoint, options.params)}${buildApiQuery(endpoint, options.query)}`);
  if (url.origin !== new URL(config.baseUrl).origin || !url.pathname.startsWith(new URL(config.baseUrl).pathname)) {
    throw new ApiConfigError("The API URL is invalid");
  }

  const headers: Record<string, string> = { Accept: "application/json", "X-Request-Id": requestId };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (endpoint.auth === "session" && options.session) {
    if (!isValidSessionToken(options.session)) throw new ApiConfigError("The session value is not valid");
    headers.Cookie = `${config.upstreamCookieName}=${options.session}`;
  }
  if (options.clientIp && isIP(options.clientIp) !== 0) headers["X-Forwarded-For"] = options.clientIp;

  let response: Response;
  try {
    response = await doFetch(url, {
      method: endpoint.method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new UpstreamUnavailableError(timedOut ? "timeout" : "network");
  }

  const text = await readBounded(response, config.maxResponseBytes);
  const upstreamRequestId = response.headers.get("x-request-id");
  const sessionCookie = parseUpstreamSessionCookie(response.headers.getSetCookie?.() ?? [], config.upstreamCookieName);

  if (!response.ok) {
    const parsed = errorBodySchema.safeParse(safeJson(text));
    if (!parsed.success) {
      throw new ApiError({ status: response.status, code: "upstream_error", message: "The service returned an error", requestId: upstreamRequestId });
    }
    const { error } = parsed.data;
    throw new ApiError({
      status: response.status,
      code: error.code,
      message: error.message,
      requestId: error.requestId ?? upstreamRequestId,
      details: error.details ?? [],
      retryAfterSeconds: parseRetryAfter(response.headers.get("retry-after")),
    });
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("json")) throw new UpstreamContractError();
  const body = safeJson(text);
  if (typeof body !== "object" || body === null || !("data" in body)) throw new UpstreamContractError();
  const data = endpoint.schema.safeParse((body as { data: unknown }).data);
  if (!data.success) throw new UpstreamContractError();

  const meta = (body as { meta?: unknown }).meta;
  return {
    data: data.data,
    status: response.status,
    sessionCookie,
    requestId: upstreamRequestId ?? requestId,
    meta: typeof meta === "object" && meta !== null && !Array.isArray(meta) ? (meta as Record<string, unknown>) : null,
  };
}
