import "server-only";
import { z } from "zod";
import { ApiConfigError } from "./errors";

export interface ApiConfig {
  /** Base URL including the API's version path, for example `http://localhost:4000/api/v1`. No trailing slash. */
  baseUrl: string;
  timeoutMs: number;
  maxResponseBytes: number;
  /** Name of the session cookie as the API knows it. */
  upstreamCookieName: string;
  /** Number of trusted reverse proxies in FRONT of this server (0 = none). See client-ip.ts. */
  trustedProxyHops: number;
  /** Exact public origin(s) of this application, for checking custom state-changing route handlers. */
  appOrigins: readonly string[];
  isProduction: boolean;
}

const COOKIE_NAME = /^[A-Za-z0-9_-]{1,64}$/;

const envSchema = z.object({
  API_BASE_URL: z.string().trim().optional(),
  API_TIMEOUT_MS: z.string().trim().optional(),
  API_SESSION_COOKIE_NAME: z.string().trim().optional(),
  API_ALLOW_INSECURE_HTTP: z.string().trim().optional(),
  TRUSTED_PROXY_HOPS: z.string().trim().optional(),
  APP_ORIGIN: z.string().trim().optional(),
});

/** Local-development convenience only; never used when NODE_ENV is production. */
const DEV_API_BASE_URL = "http://localhost:4000/api/v1";
const DEV_APP_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"] as const;

/** A loopback address cannot be a public deployment, so plain http is acceptable there even with NODE_ENV=production (local production builds, e2e tests). */
const isLoopbackHost = (hostname: string) => hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

function parseBaseUrl(raw: string, production: boolean, allowInsecure: boolean): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ApiConfigError("API_BASE_URL is not a valid URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new ApiConfigError("API_BASE_URL must use http or https");
  if (url.username || url.password) throw new ApiConfigError("API_BASE_URL must not contain credentials");
  if (url.search || url.hash) throw new ApiConfigError("API_BASE_URL must not contain a query string or fragment");
  if (production && url.protocol !== "https:" && !allowInsecure) {
    throw new ApiConfigError("API_BASE_URL must use https in production (set API_ALLOW_INSECURE_HTTP=true only for a private network hop)");
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

function parseOrigins(raw: string | undefined, production: boolean): readonly string[] {
  if (!raw) {
    if (production) throw new ApiConfigError("APP_ORIGIN must be set in production");
    return DEV_APP_ORIGINS;
  }
  const origins = raw.split(",").map((part) => part.trim()).filter(Boolean);
  if (origins.length === 0) throw new ApiConfigError("APP_ORIGIN is empty");
  return origins.map((origin) => {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new ApiConfigError("APP_ORIGIN contains an invalid origin");
    }
    if (url.origin !== origin) throw new ApiConfigError("APP_ORIGIN entries must be bare origins such as https://app.example.com");
    if (production && url.protocol !== "https:" && !isLoopbackHost(url.hostname)) {
      throw new ApiConfigError("APP_ORIGIN must use https in production (plain http is accepted only for a loopback address)");
    }
    return url.origin;
  });
}

/** Pure and testable: validates an environment object. Throws ApiConfigError; never returns a guessed production value. */
export function parseApiConfig(env: Record<string, string | undefined>): ApiConfig {
  const parsed = envSchema.parse(env);
  const production = env.NODE_ENV === "production";

  const rawBase = parsed.API_BASE_URL || (production ? undefined : DEV_API_BASE_URL);
  if (!rawBase) throw new ApiConfigError("API_BASE_URL must be set in production");
  const baseUrl = parseBaseUrl(rawBase, production, parsed.API_ALLOW_INSECURE_HTTP === "true");

  const timeoutMs = parsed.API_TIMEOUT_MS ? Number(parsed.API_TIMEOUT_MS) : 10_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 500 || timeoutMs > 60_000) {
    throw new ApiConfigError("API_TIMEOUT_MS must be an integer between 500 and 60000");
  }

  const upstreamCookieName = parsed.API_SESSION_COOKIE_NAME || "ioh_session";
  if (!COOKIE_NAME.test(upstreamCookieName)) throw new ApiConfigError("API_SESSION_COOKIE_NAME is not a valid cookie name");

  // The number of trusted proxies is a deployment fact. In production it must be stated explicitly (0 is a valid statement).
  if (production && parsed.TRUSTED_PROXY_HOPS === undefined) {
    throw new ApiConfigError("TRUSTED_PROXY_HOPS must be set explicitly in production (0 if no reverse proxy is in front of this server)");
  }
  const hopsRaw = parsed.TRUSTED_PROXY_HOPS === undefined ? 0 : Number(parsed.TRUSTED_PROXY_HOPS);
  if (!Number.isInteger(hopsRaw) || hopsRaw < 0 || hopsRaw > 5) throw new ApiConfigError("TRUSTED_PROXY_HOPS must be an integer between 0 and 5");

  return {
    baseUrl,
    timeoutMs,
    maxResponseBytes: 1_048_576,
    upstreamCookieName,
    trustedProxyHops: hopsRaw,
    appOrigins: parseOrigins(parsed.APP_ORIGIN, production),
    isProduction: production,
  };
}

let cached: ApiConfig | undefined;

export function getApiConfig(): ApiConfig {
  cached ??= parseApiConfig(process.env);
  return cached;
}

/** Test helper: forget the memoised configuration. */
export function resetApiConfigForTests(): void {
  cached = undefined;
}
