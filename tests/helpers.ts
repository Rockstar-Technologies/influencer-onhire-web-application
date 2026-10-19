import type { ApiConfig } from "@/lib/api/config";

export const TOKEN = "AbCdEf0123456789_-AbCdEf0123456789";
export const USER_ID = "11111111-1111-4111-8111-111111111111";

export const TEST_CONFIG: ApiConfig = {
  baseUrl: "http://api.test/api/v1",
  timeoutMs: 1_000,
  maxResponseBytes: 10_000,
  upstreamCookieName: "ioh_session",
  trustedProxyHops: 0,
  appOrigins: ["http://localhost:3000"],
  isProduction: false,
};

export function apiUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: "user@example.com",
    fullName: "Test User",
    phone: "670000001",
    role: "brand",
    status: "active",
    restricted: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function jsonResponse(status: number, body: unknown, extraHeaders: Record<string, string | string[]> = {}): Response {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  for (const [name, value] of Object.entries(extraHeaders)) {
    for (const item of Array.isArray(value) ? value : [value]) headers.append(name, item);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export function errorBody(code: string, message = "Something", extra: Record<string, unknown> = {}) {
  return { error: { code, message, requestId: "req-1234567", ...extra } };
}

export interface RecordedCall {
  url: string;
  init: RequestInit;
  headers: Record<string, string>;
}

/** A fake fetch that records every call and answers from a queue (or a function). */
export function fakeFetch(...answers: Array<Response | Error | ((call: RecordedCall) => Response | Promise<Response>)>) {
  const calls: RecordedCall[] = [];
  const queue = [...answers];
  const impl = (async (input: URL | RequestInfo, init: RequestInit = {}) => {
    const call: RecordedCall = { url: String(input), init, headers: { ...(init.headers as Record<string, string>) } };
    calls.push(call);
    const next = queue.length > 1 ? queue.shift() : queue[0];
    if (next instanceof Error) throw next;
    if (typeof next === "function") return next(call);
    if (!next) throw new Error("fakeFetch: no answer queued");
    // A fresh Response per call (reading a cloned/teed stream would couple the calls together).
    return new Response(await next.clone().text(), { status: next.status, headers: next.headers });
  }) as typeof fetch;
  return { fetch: impl, calls };
}

export const sessionCookie = (token = TOKEN, extra = "") => `ioh_session=${token}; Path=/; HttpOnly; SameSite=Lax${extra}`;
