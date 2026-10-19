import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiConfigForTests } from "@/lib/api/config";
import { TARGET_ID, TEST_CONFIG, TOKEN, adminApplicationItem, adminCampaignItem, adminMe, adminPaymentDetail, adminUserItem, errorBody, jsonResponse, routeFetch } from "../helpers";
import { nextState, resetNextState } from "../mocks/next";
import { adminFailureFrom, adminFailureNotice } from "@/features/admin/failure";
import { ApiError, UpstreamUnavailableError } from "@/lib/api/errors";
import { checkText, LIMITS } from "@/features/admin/schemas";
import { label, userActions } from "@/features/admin/mapping";

vi.mock("next/headers", async () => (await import("../mocks/next")).headersModule);
vi.mock("next/navigation", async () => (await import("../mocks/next")).navigationModule);
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

const server = await import("@/features/admin/server");

function upstream(routes: Parameters<typeof routeFetch>[0], permissions = ["users.view", "applications.review", "campaigns.review", "payments.view"]) {
  const fake = routeFetch({ "GET /auth/me": adminMe(permissions), ...routes });
  vi.stubGlobal("fetch", fake.fetch);
  return fake;
}
const urlOf = (fake: ReturnType<typeof routeFetch>, key: string) => new URL(fake.calls[fake.keys().indexOf(key)]!.url);
const list = (items: unknown[], nextCursor: string | null = null) => jsonResponse(200, { data: items, meta: { nextCursor, limit: 20 } });

beforeEach(() => {
  resetNextState();
  resetApiConfigForTests();
  vi.stubEnv("API_BASE_URL", TEST_CONFIG.baseUrl);
  vi.stubEnv("TRUSTED_PROXY_HOPS", "0");
  nextState.cookies.set("ioh_session", TOKEN);
});

describe("list queries come from the URL but only allowlisted, valid values reach the API", () => {
  it("users: keeps valid filters, drops everything else", () => {
    expect(server.parseUserQuery({ q: "  kevin ", role: "brand", status: "suspended", flagged: "true", sort: "email", cursor: "abc_-=" })).toEqual({ q: "kevin", role: "brand", status: "suspended", flagged: true, sort: "email", cursor: "abc_-=" });
    expect(server.parseUserQuery({ q: "x", role: "superuser", status: "deleted; DROP TABLE users", sort: "password_hash", cursor: "../x?y=1", flagged: "yes" })).toEqual({ sort: "created_at" });
    expect(server.parseUserQuery({ q: ["a", "b"], role: ["brand", "admin"] })).toEqual({ sort: "created_at" });
    expect(server.parseUserQuery({ q: "x".repeat(101) })).toEqual({ sort: "created_at" });
  });

  it("applications and campaigns default to their review queue, and ignore unknown statuses", () => {
    expect(server.parseApplicationQuery({})).toEqual({ status: "under_review" });
    expect(server.parseApplicationQuery({ status: "approved", q: "amina" })).toEqual({ status: "approved", q: "amina" });
    expect(server.parseApplicationQuery({ status: "everything" })).toEqual({ status: "under_review" });
    expect(server.parseCampaignQuery({})).toEqual({ status: "pending_review" });
    expect(server.parseCampaignQuery({ status: "draft" })).toEqual({ status: "pending_review" }); // staff never see drafts
    expect(server.parseCampaignQuery({ status: "rejected" })).toEqual({ status: "rejected" });
  });

  it("payments: only real statuses, true flags and an invoice number shape", () => {
    expect(server.parsePaymentQuery({ status: "held", releasable: "true", disputed: "true", invoice: " INV-123 " })).toEqual({ status: "held", releasable: true, disputed: true, invoice: "INV-123" });
    expect(server.parsePaymentQuery({ status: "paid", releasable: "false", invoice: "1; select" })).toEqual({});
  });

  it("the API receives exactly the validated parameters", async () => {
    const fake = upstream({ "GET /admin/users": list([adminUserItem()], "next1") });
    const page = await server.loadUsers(server.parseUserQuery({ q: "kev", role: "brand", sort: "full_name", evil: "1" }));
    expect(page).toMatchObject({ items: [{ id: TARGET_ID }], nextCursor: "next1" });
    expect(Object.fromEntries(urlOf(fake, "GET /admin/users").searchParams)).toEqual({ limit: "20", q: "kev", role: "brand", sort: "full_name", dir: "asc" });
  });

  it("the review queues are oldest-first and history is newest-first", async () => {
    const fake = upstream({ "GET /admin/creator-applications": list([adminApplicationItem()]), "GET /admin/campaigns": list([adminCampaignItem()]) });
    await server.loadApplications({ status: "under_review" });
    expect(Object.fromEntries(urlOf(fake, "GET /admin/creator-applications").searchParams)).toMatchObject({ status: "under_review", sort: "submitted_at", dir: "asc" });
    await server.loadReviewCampaigns({ status: "rejected" });
    expect(Object.fromEntries(urlOf(fake, "GET /admin/campaigns").searchParams)).toMatchObject({ status: "rejected", sort: "created_at", dir: "desc" });
  });
});

describe("loading one record", () => {
  it("a malformed id is 'not found' and is never sent", async () => {
    const fake = upstream({});
    for (const load of [server.loadUser, server.loadApplication, server.loadReviewCampaign, server.loadPayment]) await expect(load("../admin")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(fake.calls.filter((c) => !String(c.url).includes("/auth/me"))).toHaveLength(0);
  });

  it("an unknown id is 'not found'; an ended session redirects to sign-in and back; an API failure reaches the error page", async () => {
    upstream({ [`GET /admin/payments/${TARGET_ID}`]: jsonResponse(404, errorBody("not_found", "x")) });
    await expect(server.loadPayment(TARGET_ID)).rejects.toThrow("NEXT_NOT_FOUND");
    upstream({ [`GET /admin/payments/${TARGET_ID}`]: jsonResponse(401, errorBody("unauthorized")) });
    await expect(server.loadPayment(TARGET_ID)).rejects.toMatchObject({ url: expect.stringContaining("/sign-in?next=%2Fadmin%2Fpayments") });
    upstream({ [`GET /admin/payments/${TARGET_ID}`]: jsonResponse(500, errorBody("internal_error")) });
    await expect(server.loadPayment(TARGET_ID)).rejects.toBeTruthy();
  });

  it("a payment detail is read as the API returns it, with the frozen fee and net", async () => {
    upstream({ [`GET /admin/payments/${TARGET_ID}`]: jsonResponse(200, { data: { payment: adminPaymentDetail() } }) });
    expect(await server.loadPayment(TARGET_ID)).toMatchObject({ feeXaf: 17000, netXaf: 68000, feeRatePct: 20 });
  });

  it("queue sizes count one page, mark a full page with 'more', and leave out a figure that can't be read", async () => {
    upstream({ "GET /admin/campaigns": list([adminCampaignItem(), adminCampaignItem()], "more") });
    const { ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(await server.queueSize(ENDPOINTS.adminCampaigns, { status: "pending_review" })).toEqual({ count: 2, more: true });
    upstream({ "GET /admin/campaigns": jsonResponse(500, errorBody("internal_error")) });
    expect(await server.queueSize(ENDPOINTS.adminCampaigns, { status: "pending_review" })).toBeNull();
  });
});

describe("mapping and text rules", () => {
  it("labels are readable, and an unknown value is 'Unknown' (never a crash)", () => {
    expect(label({ a: "A" }, "a")).toBe("A");
    expect(label({ a: "A" }, "zzz")).toBe("Unknown");
    expect(label({ a: "A" }, undefined)).toBe("Unknown");
  });

  it("which account buttons are shown follows the API's rules; never on yourself; another admin only for a Super Admin", () => {
    const self = { id: "me", canManageAdmins: false };
    expect(userActions({ status: "active", role: "brand" }, self, "x")).toEqual(["suspend"]);
    expect(userActions({ status: "suspended", role: "creator" }, self, "x")).toEqual(["reactivate"]);
    expect(userActions({ status: "pending", role: "creator" }, self, "x")).toEqual(["reject"]);
    expect(userActions({ status: "rejected", role: "creator" }, self, "x")).toEqual([]);
    expect(userActions({ status: "active", role: "brand" }, self, "me")).toEqual([]);
    expect(userActions({ status: "active", role: "admin" }, self, "x")).toEqual([]);
    expect(userActions({ status: "active", role: "admin" }, { id: "me", canManageAdmins: true }, "x")).toEqual(["suspend"]);
  });

  it("text checks: trimmed, within the API's lengths, optional or required, single-line when asked", () => {
    expect(checkText("  hello  ", LIMITS.rejectReason, { required: true })).toEqual({ ok: true, value: "hello" });
    expect(checkText("", LIMITS.rejectReason, { required: true })).toMatchObject({ ok: false });
    expect(checkText("   ", LIMITS.note, { required: false })).toEqual({ ok: true, value: "" });
    expect(checkText("a", LIMITS.note, { required: false })).toMatchObject({ ok: false });
    expect(checkText("x".repeat(1001), LIMITS.note, { required: false })).toMatchObject({ ok: false });
    expect(checkText("a\nb", LIMITS.userReason, { required: false, singleLine: true })).toMatchObject({ ok: false });
  });
});

describe("failure mapping", () => {
  const api = (status: number, code: string, retry?: number) => new ApiError({ status, code, message: `API says ${code}`, requestId: "req-1", ...(retry ? { retryAfterSeconds: retry } : {}) });
  it("maps statuses to kinds and never leaks internals", () => {
    expect(adminFailureFrom(api(401, "unauthorized"))).toEqual({ kind: "unauthenticated" });
    expect(adminFailureFrom(api(403, "forbidden"))).toMatchObject({ kind: "forbidden", message: "You don't have permission to do this." });
    expect(adminFailureFrom(api(404, "not_found"))).toEqual({ kind: "not_found" });
    expect(adminFailureFrom(api(409, "something_new"))).toMatchObject({ kind: "conflict", message: expect.not.stringContaining("API says") });
    expect(adminFailureFrom(api(429, "rate_limited", 90))).toEqual({ kind: "rate_limited", retryAfterSeconds: 90 });
    expect(adminFailureFrom(api(500, "x"))).toEqual({ kind: "unavailable", requestId: "req-1" });
    expect(adminFailureFrom(new UpstreamUnavailableError("network"))).toEqual({ kind: "unavailable", requestId: null });
  });
  it("definite refusals say nothing was changed; an ended session links to sign-in and back", () => {
    for (const f of [{ kind: "forbidden", message: "No." }, { kind: "not_found" }, { kind: "conflict", code: "x", message: "Nope." }, { kind: "validation", message: "Bad." }, { kind: "rate_limited", retryAfterSeconds: null }] as const) {
      expect(adminFailureNotice(f, "/admin").text, f.kind).toMatch(/Nothing was changed/);
    }
    // A lost answer may have been applied: it must not claim otherwise, and it tells the person to reload.
    const lost = adminFailureNotice({ kind: "unavailable", requestId: "req-1" }, "/admin").text;
    expect(lost).not.toMatch(/nothing was changed/i);
    expect(lost).toMatch(/may or may not have been made.*Reload/);
    expect(lost).toContain("req-1");
    expect(adminFailureNotice({ kind: "unauthenticated" }, "/admin/payments/x").link?.href).toBe("/sign-in?next=%2Fadmin%2Fpayments%2Fx&expired=1");
  });
});
