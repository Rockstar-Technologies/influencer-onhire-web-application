import { describe, expect, it, vi } from "vitest";
import { callApi } from "@/lib/api/client";
import { ENDPOINTS, buildApiPath, buildApiQuery, isAllowedEndpoint, isSafeApiPath, isUuid } from "@/lib/api/endpoints";
import type { Endpoint } from "@/lib/api/endpoints";
import { ApiConfigError, ApiError, UpstreamContractError, UpstreamUnavailableError } from "@/lib/api/errors";
import { z } from "zod";
import { TEST_CONFIG, TOKEN, apiUser, errorBody, fakeFetch, jsonResponse, sessionCookie } from "../helpers";

const deps = (fetchImpl: typeof fetch, config = TEST_CONFIG) => ({ config, fetchImpl, newRequestId: () => "req-test-0001" });

describe("endpoint allowlist", () => {
  it("lists exactly the allowed operations (auth, creator application wizard, brand campaigns, offers and hires, notifications) with fixed paths", () => {
    expect(Object.values(ENDPOINTS).map((e) => `${e.method} ${e.path}`).sort()).toEqual([
      "DELETE /brand/campaigns/:id",
      "GET /auth/me",
      "GET /brand/campaigns",
      "GET /brand/campaigns/:id",
      "GET /brand/campaigns/options",
      "GET /brand/offers",
      "GET /brand/offers/:id",
      "GET /creator/applications/current",
      "GET /creator/applications/options",
      "GET /creator/offers",
      "GET /creator/offers/:id",
      "GET /creator/offers/decline-reasons",
      "GET /creators/:username",
      "GET /notifications",
      "GET /notifications/unread-count",
      "PATCH /brand/campaigns/:id",
      "POST /auth/login",
      "POST /auth/logout",
      "POST /auth/register",
      "POST /brand/campaigns",
      "POST /brand/campaigns/:id/cancel",
      "POST /brand/campaigns/:id/submit",
      "POST /brand/offers",
      "POST /brand/offers/:id/accept",
      "POST /brand/offers/:id/cancel",
      "POST /brand/offers/:id/decline",
      "POST /creator/applications/current/submit",
      "POST /creator/applications/reapply",
      "POST /creator/offers/:id/accept",
      "POST /creator/offers/:id/decline",
      "POST /notifications/:id/read",
      "POST /notifications/read-all",
      "PUT /creator/applications/current/audience",
      "PUT /creator/applications/current/profile",
      "PUT /creator/applications/current/rates",
    ]);
  });

  it("the only variable path parts are a UUID `:id` (an offer or campaign) and a creator `:username`; the owner is never in a path", () => {
    for (const operation of Object.values(ENDPOINTS)) {
      expect(operation.path, operation.name).not.toMatch(/\{|\[|\*/);
      const variable: string[] = operation.path.match(/:[a-z]+/g) ?? [];
      expect(variable.every((part) => part === ":id" || part === ":username")).toBe(true);
      if (variable.includes(":username")) expect(operation.path).toBe("/creators/:username");
      if (variable.includes(":id")) expect(/^\/(?:brand\/(?:campaigns|offers)|creator\/offers|notifications)\//.test(operation.path), operation.path).toBe(true);
    }
  });

  it("a `:username` is filled only with a valid username, an `:id` only with a UUID", () => {
    expect(buildApiPath(ENDPOINTS.hireCreator, { username: "kevin.fitness" })).toBe("/creators/kevin.fitness");
    for (const bad of ["..", "a/b", "ab", "x".repeat(31), "kevin fitness", "kevin?x=1", ""]) {
      expect(() => buildApiPath(ENDPOINTS.hireCreator, { username: bad }), bad).toThrow();
    }
    expect(() => buildApiPath(ENDPOINTS.hireCreator, {})).toThrow();
    expect(() => buildApiPath(ENDPOINTS.me, { username: "kevin.fitness" })).toThrow();
    expect(() => buildApiPath(ENDPOINTS.brandOfferAccept, { id: "not-a-uuid" })).toThrow();
    expect(buildApiPath(ENDPOINTS.brandOfferAccept, { id: "44444444-4444-4444-8444-444444444444" })).toBe("/brand/offers/44444444-4444-4444-8444-444444444444/accept");
  });

  it("accepts only the frozen table objects, not copies or look-alikes", () => {
    expect(isAllowedEndpoint(ENDPOINTS.me)).toBe(true);
    expect(isAllowedEndpoint({ ...ENDPOINTS.me })).toBe(false);
    expect(isAllowedEndpoint({ name: "x", method: "GET", path: "/admin/users", auth: "session", schema: z.unknown() })).toBe(false);
    expect(isAllowedEndpoint(null)).toBe(false);
    expect(Object.isFrozen(ENDPOINTS.me)).toBe(true);
  });

  it.each([
    ["/auth/me", true],
    ["/auth/register", true],
    ["auth/me", false],
    ["//evil.example/x", false],
    ["/auth/../admin", false],
    ["/auth/./me", false],
    ["/auth/me?x=1", false],
    ["/auth/me#frag", false],
    ["/auth/%2e%2e/admin", false],
    ["https://evil.example/", false],
    ["/auth/me\r\nX: y", false],
  ])("isSafeApiPath(%j) = %s", (path, expected) => {
    expect(isSafeApiPath(path)).toBe(expected);
  });

  it("refuses a forged endpoint before any network call is made", async () => {
    const { fetch, calls } = fakeFetch(jsonResponse(200, { data: {} }));
    const forged: Endpoint<unknown> = { name: "x", method: "GET", path: "/admin/users", auth: "none", schema: z.unknown() };
    await expect(callApi(forged, {}, deps(fetch))).rejects.toBeInstanceOf(ApiConfigError);
    expect(calls).toHaveLength(0);
  });
});

describe("path parameters and query strings", () => {
  const ID = "33333333-3333-4333-8333-333333333333";

  it("fills :id only with a UUID", () => {
    expect(buildApiPath(ENDPOINTS.campaignGet, { id: ID })).toBe(`/brand/campaigns/${ID}`);
    expect(buildApiPath(ENDPOINTS.campaignSubmit, { id: ID.toUpperCase() })).toBe(`/brand/campaigns/${ID}/submit`);
    for (const bad of ["../admin", "abc", "", `${ID}/cancel`, `${ID}?x=1`, `${ID}%2F..`, "00000000-0000-0000-0000-000000000000x", undefined]) {
      expect(() => buildApiPath(ENDPOINTS.campaignGet, { id: bad as string }), String(bad)).toThrow(ApiConfigError);
    }
  });

  it("refuses an identifier for an operation that takes none, and a missing one for an operation that needs it", () => {
    expect(() => buildApiPath(ENDPOINTS.me, { id: ID })).toThrow(ApiConfigError);
    expect(buildApiPath(ENDPOINTS.me)).toBe("/auth/me");
    expect(() => buildApiPath(ENDPOINTS.campaignCancel)).toThrow(ApiConfigError);
  });

  it("isUuid accepts UUIDs only", () => {
    expect(isUuid(ID)).toBe(true);
    expect(isUuid("abc")).toBe(false);
    expect(isUuid(null)).toBe(false);
  });

  it("builds a query only from the keys the operation lists", () => {
    expect(buildApiQuery(ENDPOINTS.campaignList, { status: "draft", limit: 20, cursor: undefined, q: "" })).toBe("?status=draft&limit=20");
    expect(buildApiQuery(ENDPOINTS.campaignList)).toBe("");
    expect(() => buildApiQuery(ENDPOINTS.campaignList, { brandId: "other" })).toThrow(ApiConfigError);
    expect(() => buildApiQuery(ENDPOINTS.me, { status: "draft" })).toThrow(ApiConfigError);
    expect(() => buildApiQuery(ENDPOINTS.campaignList, { q: "x".repeat(301) })).toThrow(ApiConfigError);
  });

  it("encodes query values (no injection through a value)", () => {
    expect(buildApiQuery(ENDPOINTS.campaignList, { q: "a&b=c#d" })).toBe("?q=a%26b%3Dc%23d");
  });

  it("callApi builds the final URL from the table, the validated id and the allowed query, and returns meta", async () => {
    const { fetch, calls } = fakeFetch(new Response(JSON.stringify({ data: [], meta: { nextCursor: "abc", limit: 20 } }), { status: 200, headers: { "content-type": "application/json" } }));
    const result = await callApi(ENDPOINTS.campaignList, { session: TOKEN, query: { status: "open", limit: 20 } }, deps(fetch));
    expect(calls[0]!.url).toBe("http://api.test/api/v1/brand/campaigns?status=open&limit=20");
    expect(result.meta).toEqual({ nextCursor: "abc", limit: 20 });
    const one = fakeFetch(jsonResponse(200, { data: { campaign: { id: "not-a-valid-shape" } } }));
    await expect(callApi(ENDPOINTS.campaignGet, { session: TOKEN, params: { id: ID } }, deps(one.fetch))).rejects.toBeInstanceOf(UpstreamContractError);
    expect(one.calls[0]!.url).toBe(`http://api.test/api/v1/brand/campaigns/${ID}`);
    expect(one.calls[0]!.init.method).toBe("GET");
  });

  it("uses PATCH and DELETE exactly as the table says, and never calls the API for a bad id", async () => {
    const { fetch, calls } = fakeFetch(jsonResponse(200, { data: { id: ID, deleted: true } }));
    await callApi(ENDPOINTS.campaignDelete, { session: TOKEN, params: { id: ID } }, deps(fetch));
    expect(calls[0]!.init.method).toBe("DELETE");
    await expect(callApi(ENDPOINTS.campaignUpdate, { session: TOKEN, params: { id: "../x" }, body: {} }, deps(fetch))).rejects.toBeInstanceOf(ApiConfigError);
    expect(calls).toHaveLength(1);
  });
});

describe("callApi request building", () => {
  it("calls base URL + the table's path with the table's method and fixed safe options", async () => {
    const { fetch, calls } = fakeFetch(jsonResponse(200, { data: { user: apiUser() } }));
    await callApi(ENDPOINTS.login, { body: { email: "a@b.cc", password: "x", remember: false } }, deps(fetch));
    const call = calls[0]!;
    expect(call.url).toBe("http://api.test/api/v1/auth/login");
    expect(call.init.method).toBe("POST");
    expect(call.init.redirect).toBe("error");
    expect(call.init.cache).toBe("no-store");
    expect(call.init.signal).toBeInstanceOf(AbortSignal);
    expect(call.headers).toMatchObject({ Accept: "application/json", "Content-Type": "application/json", "X-Request-Id": "req-test-0001" });
    expect(call.init.body).toBe(JSON.stringify({ email: "a@b.cc", password: "x", remember: false }));
  });

  it("sends the session only to endpoints that take one, in a Cookie header and nowhere else", async () => {
    const { fetch, calls } = fakeFetch(jsonResponse(200, { data: { user: apiUser() } }));
    await callApi(ENDPOINTS.me, { session: TOKEN }, deps(fetch));
    expect(calls[0]!.headers.Cookie).toBe(`ioh_session=${TOKEN}`);
    expect(calls[0]!.url).not.toContain(TOKEN);
    expect(String(calls[0]!.init.body ?? "")).not.toContain(TOKEN);

    await callApi(ENDPOINTS.login, { session: TOKEN, body: { email: "a@b.cc", password: "x", remember: false } }, deps(fetch));
    expect(calls[1]!.headers.Cookie).toBeUndefined();
  });

  it("sends no Cookie header when there is no session", async () => {
    const { fetch, calls } = fakeFetch(jsonResponse(401, errorBody("unauthorized")));
    await expect(callApi(ENDPOINTS.me, {}, deps(fetch))).rejects.toBeInstanceOf(ApiError);
    expect(calls[0]!.headers.Cookie).toBeUndefined();
  });

  it.each(["short", "a b c d e f g h i j k l m n o p", "token;extra=1abcdefghijklmnop", "tok\r\nSet-Cookie: x=1abcdefg"])(
    "refuses to build a Cookie header from a malformed session value (%#)",
    async (bad) => {
      const { fetch, calls } = fakeFetch(jsonResponse(200, { data: { user: apiUser() } }));
      await expect(callApi(ENDPOINTS.me, { session: bad }, deps(fetch))).rejects.toBeInstanceOf(ApiConfigError);
      expect(calls).toHaveLength(0);
    },
  );

  it("forwards a client address only when it is a real IP address", async () => {
    const { fetch, calls } = fakeFetch(jsonResponse(200, { data: { user: apiUser() } }));
    await callApi(ENDPOINTS.me, { session: TOKEN, clientIp: "203.0.113.9" }, deps(fetch));
    await callApi(ENDPOINTS.me, { session: TOKEN, clientIp: "1.2.3.4, 5.6.7.8" }, deps(fetch));
    await callApi(ENDPOINTS.me, { session: TOKEN, clientIp: "evil\r\nX: 1" }, deps(fetch));
    await callApi(ENDPOINTS.me, { session: TOKEN, clientIp: null }, deps(fetch));
    expect(calls.map((c) => c.headers["X-Forwarded-For"])).toEqual(["203.0.113.9", undefined, undefined, undefined]);
  });

  it("never sends an Origin header (server-to-server)", async () => {
    const { fetch, calls } = fakeFetch(jsonResponse(200, { data: { user: apiUser() } }));
    await callApi(ENDPOINTS.me, { session: TOKEN }, deps(fetch));
    expect(Object.keys(calls[0]!.headers).map((h) => h.toLowerCase())).not.toContain("origin");
  });
});

describe("callApi responses", () => {
  it("returns validated data, the status and the session cookie the API set", async () => {
    const { fetch } = fakeFetch(jsonResponse(201, { data: { user: apiUser({ role: "creator", status: "pending", restricted: true }) } }, { "set-cookie": sessionCookie(TOKEN, "; Max-Age=2592000"), "x-request-id": "up-1" }));
    const result = await callApi(ENDPOINTS.register, { body: {} }, deps(fetch));
    expect(result.status).toBe(201);
    expect(result.data.user.role).toBe("creator");
    expect(result.sessionCookie).toEqual({ value: TOKEN, maxAgeSeconds: 2_592_000 });
    expect(result.requestId).toBe("up-1");
  });

  it("reports a cleared cookie on logout", async () => {
    const { fetch } = fakeFetch(jsonResponse(200, { data: { loggedOut: true } }, { "set-cookie": "ioh_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly" }));
    const result = await callApi(ENDPOINTS.logout, { session: TOKEN }, deps(fetch));
    expect(result.sessionCookie).toEqual({ value: null, maxAgeSeconds: null });
  });

  it("ignores cookies other than the session cookie", async () => {
    const { fetch } = fakeFetch(jsonResponse(200, { data: { user: apiUser() } }, { "set-cookie": ["analytics=1; Path=/", "evil=2; Domain=.example.com"] }));
    expect((await callApi(ENDPOINTS.login, { body: {} }, deps(fetch))).sessionCookie).toBeNull();
  });

  it("ignores unknown extra fields in the data instead of trusting them", async () => {
    const { fetch } = fakeFetch(jsonResponse(200, { data: { user: { ...apiUser(), passwordHash: "x", isSuperAdmin: true } } }));
    const result = await callApi(ENDPOINTS.login, { body: {} }, deps(fetch));
    expect(result.data.user).not.toHaveProperty("passwordHash");
    expect(result.data.user).not.toHaveProperty("isSuperAdmin");
  });

  it.each([
    [401, "invalid_credentials", "Email or password is incorrect"],
    [403, "account_suspended", "This account has been suspended."],
    [409, "email_already_registered", "exists"],
    [422, "validation_failed", "invalid"],
    [500, "internal_error", "boom"],
    [503, "request_timeout", "slow"],
  ])("maps an upstream %i %s to an ApiError", async (status, code, message) => {
    const { fetch } = fakeFetch(jsonResponse(status, errorBody(code, message, { details: [{ path: "body.email", code: "invalid_format", message: "bad" }] })));
    const error = await callApi(ENDPOINTS.login, { body: {} }, deps(fetch)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status, code, message, requestId: "req-1234567" });
    expect((error as ApiError).details).toEqual([{ path: "body.email", code: "invalid_format", message: "bad" }]);
  });

  it("reads Retry-After on a 429 (and ignores a nonsense value)", async () => {
    const ok = fakeFetch(jsonResponse(429, errorBody("rate_limited"), { "retry-after": "840" }));
    expect(await callApi(ENDPOINTS.login, { body: {} }, deps(ok.fetch)).catch((e: ApiError) => e.retryAfterSeconds)).toBe(840);
    const bad = fakeFetch(jsonResponse(429, errorBody("rate_limited"), { "retry-after": "tomorrow" }));
    expect(await callApi(ENDPOINTS.login, { body: {} }, deps(bad.fetch)).catch((e: ApiError) => e.retryAfterSeconds)).toBeNull();
  });

  it("turns an error without the documented envelope into a generic ApiError that does not echo the body", async () => {
    const { fetch } = fakeFetch(new Response("<html>secret stack trace token=abc</html>", { status: 502, headers: { "content-type": "text/html" } }));
    const error = (await callApi(ENDPOINTS.me, { session: TOKEN }, deps(fetch)).catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: "upstream_error" });
    expect(JSON.stringify(error)).not.toContain("secret");
    expect(error.message).not.toContain("secret");
  });

  it("rejects a success response that is not JSON, lacks `data`, or fails the schema", async () => {
    for (const response of [
      new Response("ok", { status: 200, headers: { "content-type": "text/plain" } }),
      jsonResponse(200, { nodata: true }),
      jsonResponse(200, { data: { user: { id: "not-a-uuid" } } }),
      jsonResponse(200, { data: { user: apiUser({ role: "superuser" }) } }),
      new Response("{not json", { status: 200, headers: { "content-type": "application/json" } }),
    ]) {
      const { fetch } = fakeFetch(response);
      await expect(callApi(ENDPOINTS.login, { body: {} }, deps(fetch))).rejects.toBeInstanceOf(UpstreamContractError);
    }
  });

  it("bounds the response size (declared and streamed)", async () => {
    const big = "x".repeat(20_000);
    const declared = fakeFetch(new Response(big, { status: 200, headers: { "content-type": "application/json", "content-length": "20000" } }));
    await expect(callApi(ENDPOINTS.me, { session: TOKEN }, deps(declared.fetch))).rejects.toBeInstanceOf(UpstreamContractError);
    const streamed = fakeFetch(new Response(big, { status: 200, headers: { "content-type": "application/json" } }));
    await expect(callApi(ENDPOINTS.me, { session: TOKEN }, deps(streamed.fetch))).rejects.toBeInstanceOf(UpstreamContractError);
  });
});

describe("callApi failures", () => {
  it("turns network failures into UpstreamUnavailableError(network)", async () => {
    const { fetch } = fakeFetch(new TypeError("fetch failed"));
    const error = await callApi(ENDPOINTS.me, { session: TOKEN }, deps(fetch)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UpstreamUnavailableError);
    expect((error as UpstreamUnavailableError).reason).toBe("network");
  });

  it("times out a hanging upstream (the abort signal really fires)", async () => {
    const hanging = ((_url: unknown, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      })) as unknown as typeof fetch;
    const error = await callApi(ENDPOINTS.me, { session: TOKEN }, deps(hanging, { ...TEST_CONFIG, timeoutMs: 30 })).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UpstreamUnavailableError);
    expect((error as UpstreamUnavailableError).reason).toBe("timeout");
  });

  it("refuses redirects (fetch is told to error rather than follow)", async () => {
    const { fetch } = fakeFetch(new TypeError("redirect mode is set to error"));
    await expect(callApi(ENDPOINTS.me, { session: TOKEN }, deps(fetch))).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });

  it("never puts the session value, passwords or request bodies into error messages, JSON or logs", async () => {
    const spies = [vi.spyOn(console, "error"), vi.spyOn(console, "warn"), vi.spyOn(console, "log")].map((spy) => spy.mockImplementation(() => undefined));
    const failures = [
      fakeFetch(new TypeError("fetch failed")),
      fakeFetch(jsonResponse(500, errorBody("internal_error", "boom"))),
      fakeFetch(jsonResponse(200, { nodata: true })),
    ];
    for (const { fetch } of failures) {
      const error = await callApi(ENDPOINTS.login, { session: TOKEN, body: { email: "a@b.cc", password: "Sup3rSecretPw" } }, deps(fetch)).catch((e: unknown) => e);
      const text = `${(error as Error).message} ${JSON.stringify(error)} ${(error as Error).stack ?? ""}`;
      expect(text).not.toContain(TOKEN);
      expect(text).not.toContain("Sup3rSecretPw");
    }
    for (const spy of spies) expect(JSON.stringify(spy.mock.calls)).not.toMatch(/Sup3rSecretPw|AbCdEf0123456789/);
  });
});
