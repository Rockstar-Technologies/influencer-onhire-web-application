import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, UpstreamUnavailableError } from "@/lib/api/errors";
import { resetApiConfigForTests } from "@/lib/api/config";
import { TEST_CONFIG, TOKEN, apiUser, errorBody, fakeFetch, jsonResponse } from "../helpers";
import { nextState, redirectTarget, resetNextState } from "../mocks/next";

vi.mock("next/headers", async () => (await import("../mocks/next")).headersModule);
vi.mock("next/navigation", async () => (await import("../mocks/next")).navigationModule);
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

const { getSession, getSessionForAction, requireAccess, requireAdmin, requireBrand, requireCreator } = await import("@/lib/auth/session");
const { authorizeAction } = await import("@/lib/auth/action-access");

function me(user: Record<string, unknown>, permissions?: string[]) {
  return jsonResponse(200, { data: { user: apiUser(user), ...(permissions ? { permissions } : {}), session: { expiresAt: "2026-12-31T00:00:00.000Z" } } });
}

function stubUpstream(...answers: Parameters<typeof fakeFetch>) {
  const upstream = fakeFetch(...answers);
  vi.stubGlobal("fetch", upstream.fetch);
  return upstream;
}

beforeEach(() => {
  resetNextState();
  resetApiConfigForTests();
  vi.stubEnv("API_BASE_URL", TEST_CONFIG.baseUrl);
  vi.stubEnv("TRUSTED_PROXY_HOPS", "0");
  nextState.cookies.set("ioh_session", TOKEN);
});

describe("session restoration (/auth/me)", () => {
  it("is anonymous without a cookie and does not call the API", async () => {
    nextState.cookies.clear();
    const upstream = stubUpstream(me({}));
    expect(await getSession()).toBeNull();
    expect(upstream.calls).toHaveLength(0);
  });

  it("treats a malformed cookie as anonymous without forwarding it", async () => {
    nextState.cookies.set("ioh_session", "bad;cookie value");
    const upstream = stubUpstream(me({}));
    expect(await getSession()).toBeNull();
    expect(upstream.calls).toHaveLength(0);
  });

  it("restores the user, admin permissions and expiry from the API", async () => {
    const upstream = stubUpstream(me({ role: "admin", phone: null }, ["payments.view", "dashboard.export"]));
    const session = await getSession();
    expect(session?.user.role).toBe("admin");
    expect(session?.permissions).toEqual(["payments.view", "dashboard.export"]);
    expect(session?.expiresAt).toBe("2026-12-31T00:00:00.000Z");
    expect(upstream.calls[0]!.url).toBe("http://api.test/api/v1/auth/me");
    expect(upstream.calls[0]!.headers.Cookie).toBe(`ioh_session=${TOKEN}`);
  });

  it("brands and creators get no permissions", async () => {
    stubUpstream(me({}));
    expect((await getSession())?.permissions).toEqual([]);
  });

  it("treats an expired or revoked session (401) as signed out; rendering does not touch the cookie", async () => {
    stubUpstream(jsonResponse(401, errorBody("unauthorized")));
    expect(await getSession()).toBeNull();
    expect(nextState.deletes).toHaveLength(0);
  });

  it("clears a cookie the API no longer accepts when running in a Server Action", async () => {
    stubUpstream(jsonResponse(401, errorBody("unauthorized")));
    expect(await getSessionForAction()).toBeNull();
    expect(nextState.deletes).toEqual(["ioh_session"]);
  });

  it("does NOT treat an outage as signed-out or signed-in: it fails closed with an error", async () => {
    stubUpstream(new TypeError("fetch failed"));
    await expect(getSession()).rejects.toBeInstanceOf(UpstreamUnavailableError);
    stubUpstream(jsonResponse(503, errorBody("request_timeout")));
    await expect(getSession()).rejects.toBeInstanceOf(ApiError);
    stubUpstream(jsonResponse(429, errorBody("rate_limited")));
    await expect(getSession()).rejects.toBeInstanceOf(ApiError);
    expect(nextState.deletes).toHaveLength(0);
  });

  it("never invents a session from a cookie alone (the demo-cookie bypass is gone)", async () => {
    nextState.cookies.set("ioh_demo_account", "u-101");
    nextState.cookies.delete("ioh_session");
    stubUpstream(me({}));
    expect(await getSession()).toBeNull();
  });
});

describe("page guards", () => {
  it("send anonymous visitors to sign-in with a safe next", async () => {
    nextState.cookies.clear();
    expect(await redirectTarget(() => requireBrand("/brand/payments"))).toBe("/sign-in?next=%2Fbrand%2Fpayments");
    expect(await redirectTarget(() => requireAdmin("/admin/users", "users.view"))).toBe("/sign-in?next=%2Fadmin%2Fusers");
    expect(await redirectTarget(() => requireCreator("/creator/earnings"))).toBe("/sign-in?next=%2Fcreator%2Fearnings");
  });

  it("come back to the exact page that was requested (recorded by proxy.ts), not just the layout's default", async () => {
    nextState.cookies.clear();
    nextState.headers.set("x-ioh-path", "/admin/users?q=amina");
    expect(await redirectTarget(() => requireAdmin("/admin", "users.view"))).toBe("/sign-in?next=%2Fadmin%2Fusers%3Fq%3Damina");
  });

  it.each(["//evil.example", "https://evil.example/admin", "/\\evil.example", "/somewhere-else"])("ignore an unsafe or unknown recorded path (%s)", async (recorded) => {
    nextState.cookies.clear();
    nextState.headers.set("x-ioh-path", recorded);
    expect(await redirectTarget(() => requireAdmin("/admin"))).toBe("/sign-in?next=%2Fadmin");
  });

  it("tell the sign-in page that the session ended when a cookie exists but the API no longer accepts it", async () => {
    stubUpstream(jsonResponse(401, errorBody("unauthorized")));
    expect(await redirectTarget(() => requireBrand("/brand/payments"))).toBe("/sign-in?next=%2Fbrand%2Fpayments&expired=1");
  });

  it("drop an unsafe next instead of carrying it", async () => {
    nextState.cookies.clear();
    expect(await redirectTarget(() => requireBrand("https://evil.example"))).toBe("/sign-in");
  });

  it("let the right role through and return the session", async () => {
    stubUpstream(me({}));
    const session = await requireBrand("/brand/payments");
    expect(session.user.role).toBe("brand");
  });

  it("send the wrong role to sign-in with a denial notice (admin area from a brand, brand area from a creator)", async () => {
    stubUpstream(me({ role: "brand" }));
    expect(await redirectTarget(() => requireAdmin("/admin"))).toBe("/sign-in?denied=admin");
    stubUpstream(me({ role: "creator" }));
    expect(await redirectTarget(() => requireBrand("/brand/payments"))).toBe("/sign-in?denied=brand");
  });

  it("keep pending creators on the application: dashboards redirect, the application is allowed", async () => {
    stubUpstream(me({ role: "creator", status: "pending", restricted: true }));
    expect(await redirectTarget(() => requireCreator("/creator/earnings"))).toBe("/for-creators/apply/profile");
    expect((await requireCreator("/for-creators/apply/profile", { allowPending: true })).user.status).toBe("pending");
  });

  it("deny suspended or rejected accounts", async () => {
    stubUpstream(me({ status: "suspended" }));
    expect(await redirectTarget(() => requireBrand("/brand/payments"))).toBe("/sign-in?denied=brand");
  });

  it("deny an admin who lacks the permission, without a redirect loop on /admin", async () => {
    stubUpstream(me({ role: "admin", phone: null }, ["users.view"]));
    expect(await redirectTarget(() => requireAdmin("/admin/payments", "payments.view"))).toBe("/admin?denied=permission");
    expect(await redirectTarget(() => requireAdmin("/admin"))).toBeNull();
  });

  it("an outage never grants access", async () => {
    stubUpstream(new TypeError("fetch failed"));
    await expect(requireAccess({ role: "admin" }, "/admin")).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });
});

describe("authorizeAction (Server Actions)", () => {
  it("denies anonymous callers with a sign-in message", async () => {
    nextState.cookies.clear();
    const result = await authorizeAction({ role: "brand" });
    expect(result).toEqual({ ok: false, message: expect.stringMatching(/sign in again/i) });
  });

  it("denies a stale session and removes the cookie", async () => {
    stubUpstream(jsonResponse(401, errorBody("unauthorized")));
    expect((await authorizeAction({ role: "brand" })).ok).toBe(false);
    expect(nextState.deletes).toEqual(["ioh_session"]);
  });

  it("denies the wrong role, a pending creator and a missing permission, and allows the right caller", async () => {
    stubUpstream(me({ role: "creator" }));
    expect((await authorizeAction({ role: "brand" })).ok).toBe(false);
    stubUpstream(me({ role: "creator", status: "pending" }));
    expect(await authorizeAction({ role: "creator" })).toEqual({ ok: false, message: expect.stringMatching(/approved/i) });
    stubUpstream(me({ role: "admin", phone: null }, ["users.view"]));
    expect(await authorizeAction({ role: "admin", permission: "payments.release" })).toEqual({ ok: false, message: expect.stringMatching(/permission/i) });
    stubUpstream(me({ role: "admin", phone: null }, ["payments.release"]));
    expect((await authorizeAction({ role: "admin", permission: "payments.release" })).ok).toBe(true);
  });
});
