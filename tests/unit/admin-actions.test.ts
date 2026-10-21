import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiConfigForTests } from "@/lib/api/config";
import { TARGET_ID, TEST_CONFIG, TOKEN, adminApplicationDetail, adminCampaignDetail, adminMe, adminPaymentDetail, adminUserDetail, apiUser, errorBody, jsonResponse, routeFetch } from "../helpers";
import { nextState, resetNextState } from "../mocks/next";

vi.mock("next/headers", async () => (await import("../mocks/next")).headersModule);
vi.mock("next/navigation", async () => (await import("../mocks/next")).navigationModule);
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

const actions = await import("@/features/admin/actions");

const calls = (fake: ReturnType<typeof routeFetch>) => fake.keys().filter((k) => k !== "GET /auth/me");
const body = (fake: ReturnType<typeof routeFetch>, key: string) => JSON.parse(String(fake.calls[fake.keys().indexOf(key)]!.init.body));
const ALL = ["users.view", "users.moderate", "applications.review", "campaigns.review", "payments.view", "payments.release"];

function upstream(routes: Parameters<typeof routeFetch>[0], permissions: string[] = ALL, user: Record<string, unknown> = {}) {
  const fake = routeFetch({ "GET /auth/me": adminMe(permissions, user), ...routes });
  vi.stubGlobal("fetch", fake.fetch);
  return fake;
}

beforeEach(() => {
  resetNextState();
  resetApiConfigForTests();
  vi.stubEnv("API_BASE_URL", TEST_CONFIG.baseUrl);
  vi.stubEnv("TRUSTED_PROXY_HOPS", "0");
  nextState.cookies.set("ioh_session", TOKEN);
});

const SUSPEND = `POST /admin/users/${TARGET_ID}/suspend`;
const USER = `GET /admin/users/${TARGET_ID}`;
const APPROVE_APP = `POST /admin/creator-applications/${TARGET_ID}/approve`;
const REJECT_APP = `POST /admin/creator-applications/${TARGET_ID}/reject`;
const APP = `GET /admin/creator-applications/${TARGET_ID}`;
const APPROVE_CMP = `POST /admin/campaigns/${TARGET_ID}/approve`;
const REJECT_CMP = `POST /admin/campaigns/${TARGET_ID}/reject`;
const CMP = `GET /admin/campaigns/${TARGET_ID}`;
const RELEASE = `POST /admin/payments/${TARGET_ID}/release`;
const PAY = `GET /admin/payments/${TARGET_ID}`;

describe("who may do what (permission matrix, checked before anything is sent)", () => {
  const cases: [string, () => Promise<unknown>, string][] = [
    ["moderate a user", () => actions.moderateUserAction({ id: TARGET_ID, kind: "suspend" }), "users.moderate"],
    ["decide an application", () => actions.decideApplicationAction({ id: TARGET_ID, kind: "approve" }), "applications.review"],
    ["decide a campaign", () => actions.decideCampaignAction({ id: TARGET_ID, kind: "approve" }), "campaigns.review"],
    ["release a payment", () => actions.releasePaymentAction({ id: TARGET_ID }), "payments.release"],
  ];

  it.each(cases)("%s: refused without %s even for an administrator holding every other permission, and the API is not called", async (_name, run, needed) => {
    const fake = upstream({}, ALL.filter((p) => p !== needed));
    expect(await run()).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    expect(calls(fake)).toEqual([]);
  });

  it.each(cases)("%s: refused for a brand, a creator and a pending creator", async (_name, run) => {
    for (const user of [{ role: "brand" }, { role: "creator" }, { role: "creator", status: "pending" }]) {
      const fake = routeFetch({ "GET /auth/me": jsonResponse(200, { data: { user: apiUser(user), session: { expiresAt: "2026-12-31T00:00:00.000Z" } } }) });
      vi.stubGlobal("fetch", fake.fetch);
      expect(await run(), JSON.stringify(user)).toMatchObject({ ok: false, error: { kind: "forbidden" } });
      expect(calls(fake)).toEqual([]);
    }
  });

  it.each(cases)("%s: refused for a suspended administrator", async (_name, run) => {
    const fake = upstream({}, ALL, { status: "suspended" });
    expect(await run()).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    expect(calls(fake)).toEqual([]);
  });

  it("the roles the seed defines: a Campaign Manager can moderate and review but not release; Finance can release but not moderate", async () => {
    const manager = ["users.view", "users.moderate", "applications.review", "campaigns.review"];
    upstream({ [SUSPEND]: jsonResponse(200, { data: { user: adminUserDetail() } }) }, manager);
    expect(await actions.moderateUserAction({ id: TARGET_ID, kind: "suspend" })).toMatchObject({ ok: true });
    expect(await actions.releasePaymentAction({ id: TARGET_ID })).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    const finance = ["payments.view", "payments.release", "dashboard.view"];
    const fake = upstream({}, finance);
    expect(await actions.moderateUserAction({ id: TARGET_ID, kind: "suspend" })).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    expect(await actions.decideApplicationAction({ id: TARGET_ID, kind: "approve" })).toMatchObject({ ok: false });
    expect(calls(fake)).toEqual([]);
  });

  it("without a cookie nothing is sent; an ended session keeps the cookie; a session ending mid-call is reported", async () => {
    nextState.cookies.clear();
    const fake = upstream({});
    expect(await actions.releasePaymentAction({ id: TARGET_ID })).toEqual({ ok: false, error: { kind: "unauthenticated" } });
    expect(fake.calls).toHaveLength(0);
    nextState.cookies.set("ioh_session", TOKEN);
    vi.stubGlobal("fetch", routeFetch({ "GET /auth/me": jsonResponse(401, errorBody("unauthorized")) }).fetch);
    expect(await actions.releasePaymentAction({ id: TARGET_ID })).toEqual({ ok: false, error: { kind: "unauthenticated" } });
    expect(nextState.deletes).toEqual([]);
    upstream({ [RELEASE]: jsonResponse(401, errorBody("unauthorized")) });
    expect(await actions.releasePaymentAction({ id: TARGET_ID })).toEqual({ ok: false, error: { kind: "unauthenticated" } });
  });
});

describe("input is only an id, a kind and the admin's own words", () => {
  it("refuses a status, a reviewer, an actor, a permission or any other field before calling the API", async () => {
    const fake = upstream({});
    for (const extra of [{ status: "active" }, { reviewedBy: "x" }, { actorId: "x" }, { permissions: ["users.view"] }, { role: "admin" }, { userId: "x" }]) {
      expect(await actions.moderateUserAction({ id: TARGET_ID, kind: "suspend", ...extra }), JSON.stringify(extra)).toMatchObject({ ok: false });
      expect(await actions.decideApplicationAction({ id: TARGET_ID, kind: "approve", ...extra })).toMatchObject({ ok: false });
      expect(await actions.decideCampaignAction({ id: TARGET_ID, kind: "approve", ...extra })).toMatchObject({ ok: false });
      expect(await actions.releasePaymentAction({ id: TARGET_ID, ...extra })).toMatchObject({ ok: false });
    }
    expect(calls(fake)).toEqual([]);
  });

  it("refuses unknown kinds and ids that are not UUIDs, so nothing odd reaches a path", async () => {
    const fake = upstream({});
    for (const bad of ["../admin", "abc", `${TARGET_ID}/release`, `${TARGET_ID}?x=1`, ""]) {
      expect(await actions.moderateUserAction({ id: bad, kind: "suspend" })).toMatchObject({ ok: false });
      expect(await actions.releasePaymentAction({ id: bad })).toMatchObject({ ok: false });
    }
    for (const kind of ["delete", "promote", "release", ""]) expect(await actions.moderateUserAction({ id: TARGET_ID, kind })).toMatchObject({ ok: false });
    expect(await actions.decideApplicationAction({ id: TARGET_ID, kind: "suspend" })).toMatchObject({ ok: false });
    expect(calls(fake)).toEqual([]);
  });

  it("enforces the API's text lengths locally: a rejection needs a reason of at least 5 characters, a user reason is one line of 3 to 500", async () => {
    const fake = upstream({});
    for (const run of [(text?: string) => actions.decideApplicationAction({ id: TARGET_ID, kind: "reject", ...(text === undefined ? {} : { text }) }), (text?: string) => actions.decideCampaignAction({ id: TARGET_ID, kind: "reject", ...(text === undefined ? {} : { text }) })]) {
      for (const text of [undefined, "", "   ", "no", "four", "x".repeat(1001)]) expect(await run(text), String(text)).toMatchObject({ ok: false, error: { kind: "validation" } });
    }
    for (const reason of ["ab", "line one\nline two", "x".repeat(501)]) expect(await actions.moderateUserAction({ id: TARGET_ID, kind: "suspend", reason })).toMatchObject({ ok: false, error: { kind: "validation" } });
    expect(await actions.decideApplicationAction({ id: TARGET_ID, kind: "approve", text: "x" })).toMatchObject({ ok: false });
    expect(calls(fake)).toEqual([]);
  });
});

describe("users", () => {
  it("suspend: POSTs to that account's path with an empty body when no reason is given, and reports the new status", async () => {
    const fake = upstream({ [SUSPEND]: jsonResponse(200, { data: { user: adminUserDetail({ status: "suspended" }) } }) });
    expect(await actions.moderateUserAction({ id: TARGET_ID, kind: "suspend" })).toEqual({ ok: true, status: "suspended" });
    expect(calls(fake)).toEqual([SUSPEND]);
    expect(body(fake, SUSPEND)).toEqual({});
  });

  it("sends a trimmed reason, and the new status is never an input", async () => {
    const fake = upstream({ [`POST /admin/users/${TARGET_ID}/reject`]: jsonResponse(200, { data: { user: adminUserDetail({ status: "rejected" }) } }) });
    expect(await actions.moderateUserAction({ id: TARGET_ID, kind: "reject", reason: "  fake documents  " })).toEqual({ ok: true, status: "rejected" });
    expect(body(fake, `POST /admin/users/${TARGET_ID}/reject`)).toEqual({ reason: "fake documents" });
  });

  it.each([
    ["cannot_modify_self", 403, /own account/],
    ["insufficient_permissions", 403, /Super Admin/],
    ["last_super_admin", 409, /last active Super Admin/],
    ["invalid_state_transition", 409, /doesn't allow that change/],
    ["creator_not_approved", 409, /no approved profile/],
  ])("%s is explained and never reported as done", async (code, status, text) => {
    upstream({ [SUSPEND]: jsonResponse(status, errorBody(code, "x")) });
    const result = await actions.moderateUserAction({ id: TARGET_ID, kind: "suspend" });
    expect(result).toMatchObject({ ok: false, error: { kind: "conflict", code } });
    expect((result as { error: { message: string } }).error.message).toMatch(text);
  });

  it("a plain 403 (no permission at the API) is 'forbidden'; a missing or foreign id is 'not found'", async () => {
    upstream({ [SUSPEND]: jsonResponse(403, errorBody("forbidden", "x")) });
    expect(await actions.moderateUserAction({ id: TARGET_ID, kind: "suspend" })).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    upstream({ [SUSPEND]: jsonResponse(404, errorBody("not_found", "x")) });
    expect(await actions.moderateUserAction({ id: TARGET_ID, kind: "suspend" })).toEqual({ ok: false, error: { kind: "not_found" } });
  });

  it("a duplicate (409) is success only when a fresh read shows exactly the wanted status", async () => {
    upstream({ [SUSPEND]: jsonResponse(409, errorBody("invalid_state_transition", "x")), [USER]: jsonResponse(200, { data: { user: adminUserDetail({ status: "suspended" }) } }) });
    expect(await actions.moderateUserAction({ id: TARGET_ID, kind: "suspend" })).toEqual({ ok: true, status: "suspended" });
    upstream({ [SUSPEND]: jsonResponse(409, errorBody("invalid_state_transition", "x")), [USER]: jsonResponse(200, { data: { user: adminUserDetail({ status: "rejected" }) } }) });
    expect(await actions.moderateUserAction({ id: TARGET_ID, kind: "suspend" })).toMatchObject({ ok: false, error: { kind: "conflict" } });
    upstream({ [SUSPEND]: jsonResponse(409, errorBody("invalid_state_transition", "x")), [USER]: jsonResponse(500, errorBody("internal_error")) });
    expect(await actions.moderateUserAction({ id: TARGET_ID, kind: "suspend" })).toMatchObject({ ok: false, error: { kind: "conflict" } });
  });
});

describe("creator applications", () => {
  it("approve: an optional note goes as `note`; reject: the reason goes as `reason`; the status is the API's", async () => {
    const fake = upstream({ [APPROVE_APP]: jsonResponse(200, { data: {} }), [REJECT_APP]: jsonResponse(200, { data: {} }) });
    expect(await actions.decideApplicationAction({ id: TARGET_ID, kind: "approve", text: " looks good " })).toEqual({ ok: true, status: "approved" });
    expect(body(fake, APPROVE_APP)).toEqual({ note: "looks good" });
    expect(await actions.decideApplicationAction({ id: TARGET_ID, kind: "approve" })).toEqual({ ok: true, status: "approved" });
    expect(await actions.decideApplicationAction({ id: TARGET_ID, kind: "reject", text: "Please add clearer samples." })).toEqual({ ok: true, status: "rejected" });
    expect(body(fake, REJECT_APP)).toEqual({ reason: "Please add clearer samples." });
  });

  it("an application that is no longer under review is a conflict; a repeated decision with the same result is success", async () => {
    upstream({ [APPROVE_APP]: jsonResponse(409, errorBody("application_not_under_review", "x")), [APP]: jsonResponse(200, { data: { application: adminApplicationDetail({ status: "rejected" }) } }) });
    expect(await actions.decideApplicationAction({ id: TARGET_ID, kind: "approve" })).toMatchObject({ ok: false, error: { kind: "conflict", code: "application_not_under_review" } });
    upstream({ [APPROVE_APP]: jsonResponse(409, errorBody("application_not_under_review", "x")), [APP]: jsonResponse(200, { data: { application: adminApplicationDetail({ status: "approved" }) } }) });
    expect(await actions.decideApplicationAction({ id: TARGET_ID, kind: "approve" })).toEqual({ ok: true, status: "approved" });
  });

  it("an API 422 is a validation message and nothing is claimed", async () => {
    upstream({ [REJECT_APP]: jsonResponse(422, errorBody("validation_failed", "x", { details: [{ path: "body.reason", message: "must be at least 5 characters" }] })) });
    expect(await actions.decideApplicationAction({ id: TARGET_ID, kind: "reject", text: "Not enough." })).toMatchObject({ ok: false, error: { kind: "validation", message: expect.stringContaining("must be at least 5") } });
  });
});

describe("campaign review", () => {
  it("approve opens the campaign; reject sends a reason", async () => {
    const fake = upstream({ [APPROVE_CMP]: jsonResponse(200, { data: {} }), [REJECT_CMP]: jsonResponse(200, { data: {} }) });
    expect(await actions.decideCampaignAction({ id: TARGET_ID, kind: "approve" })).toEqual({ ok: true, status: "open" });
    expect(await actions.decideCampaignAction({ id: TARGET_ID, kind: "reject", text: "Budget is unclear." })).toEqual({ ok: true, status: "rejected" });
    expect(body(fake, REJECT_CMP)).toEqual({ reason: "Budget is unclear." });
  });

  it("a duplicate approval is success only when the campaign is open now; a rejected one is a conflict", async () => {
    upstream({ [APPROVE_CMP]: jsonResponse(409, errorBody("campaign_not_pending_review", "x")), [CMP]: jsonResponse(200, { data: { campaign: adminCampaignDetail({ status: "open" }) } }) });
    expect(await actions.decideCampaignAction({ id: TARGET_ID, kind: "approve" })).toEqual({ ok: true, status: "open" });
    upstream({ [APPROVE_CMP]: jsonResponse(409, errorBody("campaign_not_pending_review", "x")), [CMP]: jsonResponse(200, { data: { campaign: adminCampaignDetail({ status: "rejected" }) } }) });
    expect(await actions.decideCampaignAction({ id: TARGET_ID, kind: "approve" })).toMatchObject({ ok: false, error: { kind: "conflict" } });
  });
});

describe("payment release", () => {
  it("POSTs an empty body to that payment and reports released only after the API said so", async () => {
    const fake = upstream({ [RELEASE]: jsonResponse(200, { data: { payment: adminPaymentDetail({ status: "released" }) } }) });
    expect(await actions.releasePaymentAction({ id: TARGET_ID })).toEqual({ ok: true, status: "released" });
    expect(body(fake, RELEASE)).toEqual({});
  });

  it.each([
    ["release_not_yet_eligible", /brand can still dispute/],
    ["delivery_not_reported", /not reported the delivery/],
    ["payment_disputed", /dispute/],
    ["payment_refund_pending", /refund/],
    ["simulated_funds", /Simulated funds/],
  ])("%s is explained and is never a success", async (code, text) => {
    upstream({ [RELEASE]: jsonResponse(409, errorBody(code, "x")), [PAY]: jsonResponse(200, { data: { payment: adminPaymentDetail({ status: "requested" }) } }) });
    const result = await actions.releasePaymentAction({ id: TARGET_ID });
    expect(result).toMatchObject({ ok: false, error: { kind: "conflict", code } });
    expect((result as { error: { message: string } }).error.message).toMatch(text);
  });

  it("a second click on an already released payment is success; releasing something else's state is not", async () => {
    upstream({ [RELEASE]: jsonResponse(409, errorBody("payment_already_released", "x")), [PAY]: jsonResponse(200, { data: { payment: adminPaymentDetail({ status: "released" }) } }) });
    expect(await actions.releasePaymentAction({ id: TARGET_ID })).toEqual({ ok: true, status: "released" });
    upstream({ [RELEASE]: jsonResponse(409, errorBody("payment_already_released", "x")), [PAY]: jsonResponse(200, { data: { payment: adminPaymentDetail({ status: "refunded" }) } }) });
    expect(await actions.releasePaymentAction({ id: TARGET_ID })).toMatchObject({ ok: false });
  });
});

describe("failures are never reported as done", () => {
  it.each([
    { label: "network failure", answer: new TypeError("fetch failed") },
    { label: "server error", answer: jsonResponse(500, errorBody("internal_error")) },
    { label: "gateway timeout", answer: jsonResponse(503, errorBody("request_timeout")) },
  ])("a $label is 'unavailable' for every action, with a retry possible", async ({ answer }) => {
    upstream({ [SUSPEND]: answer, [APPROVE_APP]: answer, [APPROVE_CMP]: answer, [RELEASE]: answer });
    for (const result of [await actions.moderateUserAction({ id: TARGET_ID, kind: "suspend" }), await actions.decideApplicationAction({ id: TARGET_ID, kind: "approve" }), await actions.decideCampaignAction({ id: TARGET_ID, kind: "approve" }), await actions.releasePaymentAction({ id: TARGET_ID })]) {
      expect(result).toMatchObject({ ok: false, error: { kind: "unavailable" } });
    }
  });

  it("a failed attempt can be retried and then succeeds", async () => {
    let attempt = 0;
    upstream({ [RELEASE]: () => (++attempt === 1 ? jsonResponse(503, errorBody("request_timeout")) : jsonResponse(200, { data: {} })) });
    expect(await actions.releasePaymentAction({ id: TARGET_ID })).toMatchObject({ ok: false });
    expect(await actions.releasePaymentAction({ id: TARGET_ID })).toEqual({ ok: true, status: "released" });
  });

  it("a rate limit carries the wait time; the session is never logged or returned", async () => {
    upstream({ [RELEASE]: jsonResponse(429, errorBody("rate_limited", "x"), { "retry-after": "30" }) });
    expect(await actions.releasePaymentAction({ id: TARGET_ID })).toMatchObject({ ok: false, error: { kind: "rate_limited", retryAfterSeconds: 30 } });
    const spies = [vi.spyOn(console, "error"), vi.spyOn(console, "warn"), vi.spyOn(console, "log")].map((s) => s.mockImplementation(() => undefined));
    upstream({ [RELEASE]: new TypeError("boom") });
    const result = await actions.releasePaymentAction({ id: TARGET_ID });
    expect(JSON.stringify(result)).not.toContain("AbCdEf0123456789");
    for (const spy of spies) expect(JSON.stringify(spy.mock.calls)).not.toContain("AbCdEf0123456789");
  });
});
