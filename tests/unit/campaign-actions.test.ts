import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiConfigForTests } from "@/lib/api/config";
import { CAMPAIGN_ID, TEST_CONFIG, TOKEN, apiUser, campaignView, errorBody, jsonResponse, routeFetch } from "../helpers";
import { nextState, resetNextState } from "../mocks/next";

vi.mock("next/headers", async () => (await import("../mocks/next")).headersModule);
vi.mock("next/navigation", async () => (await import("../mocks/next")).navigationModule);
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

const actions = await import("@/features/brand-campaigns/actions");

const me = (user: Record<string, unknown> = {}) => jsonResponse(200, { data: { user: apiUser(user), session: { expiresAt: "2026-12-31T00:00:00.000Z" } } });
const one = (campaign: unknown) => jsonResponse(200, { data: { campaign } });
const BASE = "/brand/campaigns";
const BODY = {
  title: "Summer Glow Launch",
  niche: "beauty",
  budgetXaf: 500000,
  startDate: "2031-03-01",
  endDate: "2031-03-31",
  deliverables: "1 story + 2 TikToks + 1 YouTube mention",
  minEngagementPct: 5,
  cities: ["douala"],
  interests: [],
  ageRanges: ["45-plus"],
  imageFileIds: [],
};

function upstream(routes: Parameters<typeof routeFetch>[0]) {
  const fake = routeFetch({ "GET /auth/me": me(), ...routes });
  vi.stubGlobal("fetch", fake.fetch);
  return fake;
}
const callsTo = (fake: ReturnType<typeof routeFetch>, key: string) => fake.calls.filter((_, index) => fake.keys()[index] === key);

beforeEach(() => {
  resetNextState();
  resetApiConfigForTests();
  vi.stubEnv("API_BASE_URL", TEST_CONFIG.baseUrl);
  vi.stubEnv("TRUSTED_PROXY_HOPS", "0");
  nextState.cookies.set("ioh_session", TOKEN);
});

describe("saving a draft", () => {
  it("creates a draft: POST with the API's body, and returns the API's own view of it", async () => {
    const fake = upstream({ [`POST ${BASE}`]: jsonResponse(201, { data: { campaign: campaignView() } }) });
    const result = await actions.saveCampaignAction({ id: null, campaign: BODY, submit: false });
    expect(result).toEqual({ ok: true, campaign: expect.objectContaining({ id: CAMPAIGN_ID, status: "draft" }), submitted: false });
    expect(JSON.parse(String(callsTo(fake, `POST ${BASE}`)[0]!.init.body))).toEqual(BODY);
    expect(fake.keys().filter((k) => k !== "GET /auth/me")).toEqual([`POST ${BASE}`]); // not submitted
  });

  it("updates an existing draft: PATCH on that draft's path", async () => {
    const fake = upstream({ [`PATCH ${BASE}/${CAMPAIGN_ID}`]: one(campaignView({ title: "Renamed" })) });
    const result = await actions.saveCampaignAction({ id: CAMPAIGN_ID, campaign: { ...BODY, title: "Renamed" }, submit: false });
    expect(result).toMatchObject({ ok: true, campaign: { title: "Renamed" } });
    expect(fake.keys()).toContain(`PATCH ${BASE}/${CAMPAIGN_ID}`);
  });

  it("a rejected save reports the API's field errors and saves nothing", async () => {
    upstream({ [`POST ${BASE}`]: jsonResponse(422, errorBody("budget_out_of_range", "x", { details: [{ path: "body.budgetXaf", message: "must be between 50000 and 100000000" }] })) });
    const result = await actions.saveCampaignAction({ id: null, campaign: { ...BODY, budgetXaf: 10 }, submit: true });
    expect(result).toEqual({ ok: false, savedId: null, error: expect.objectContaining({ kind: "validation", fields: { budget: "must be between 50000 and 100000000" } }) });
  });
});

describe("submitting for review", () => {
  it("creates, then submits, and returns the real pending_review status", async () => {
    const fake = upstream({
      [`POST ${BASE}`]: jsonResponse(201, { data: { campaign: campaignView() } }),
      [`POST ${BASE}/${CAMPAIGN_ID}/submit`]: one(campaignView({ status: "pending_review", submittedAt: "2026-10-19T11:00:00.000Z" })),
    });
    const result = await actions.saveCampaignAction({ id: null, campaign: BODY, submit: true });
    expect(result).toEqual({ ok: true, submitted: true, campaign: expect.objectContaining({ status: "pending_review" }) });
    expect(fake.keys().filter((k) => k !== "GET /auth/me")).toEqual([`POST ${BASE}`, `POST ${BASE}/${CAMPAIGN_ID}/submit`]);
  });

  it("if the draft was created but submitting failed, it says the draft exists (savedId) and a retry updates THAT draft, not a new one", async () => {
    let attempt = 0;
    const fake = upstream({
      [`POST ${BASE}`]: jsonResponse(201, { data: { campaign: campaignView() } }),
      [`PATCH ${BASE}/${CAMPAIGN_ID}`]: one(campaignView()),
      [`POST ${BASE}/${CAMPAIGN_ID}/submit`]: () => (++attempt === 1 ? jsonResponse(503, errorBody("request_timeout")) : one(campaignView({ status: "pending_review" }))),
    });
    const first = await actions.saveCampaignAction({ id: null, campaign: BODY, submit: true });
    expect(first).toEqual({ ok: false, savedId: CAMPAIGN_ID, error: expect.objectContaining({ kind: "unavailable" }) });
    const retry = await actions.saveCampaignAction({ id: CAMPAIGN_ID, campaign: BODY, submit: true });
    expect(retry).toMatchObject({ ok: true, submitted: true });
    expect(callsTo(fake, `POST ${BASE}`)).toHaveLength(1); // only ever created once
  });

  it("a duplicate submit (409 campaign_not_draft) is success when the server holds it as pending review", async () => {
    upstream({
      [`PATCH ${BASE}/${CAMPAIGN_ID}`]: jsonResponse(409, errorBody("campaign_not_editable", "x")),
    });
    expect(await actions.saveCampaignAction({ id: CAMPAIGN_ID, campaign: BODY, submit: true })).toMatchObject({ ok: false, error: { kind: "conflict" } });
    upstream({
      [`PATCH ${BASE}/${CAMPAIGN_ID}`]: one(campaignView()),
      [`POST ${BASE}/${CAMPAIGN_ID}/submit`]: jsonResponse(409, errorBody("campaign_not_draft", "x")),
      [`GET ${BASE}/${CAMPAIGN_ID}`]: one(campaignView({ status: "pending_review" })),
    });
    expect(await actions.saveCampaignAction({ id: CAMPAIGN_ID, campaign: BODY, submit: true })).toMatchObject({ ok: true, submitted: true, campaign: { status: "pending_review" } });
  });

  it("a 409 on submit when the campaign is something else (for example cancelled) is reported, not hidden", async () => {
    upstream({
      [`PATCH ${BASE}/${CAMPAIGN_ID}`]: one(campaignView()),
      [`POST ${BASE}/${CAMPAIGN_ID}/submit`]: jsonResponse(409, errorBody("campaign_not_draft", "x")),
      [`GET ${BASE}/${CAMPAIGN_ID}`]: one(campaignView({ status: "cancelled" })),
    });
    expect(await actions.saveCampaignAction({ id: CAMPAIGN_ID, campaign: BODY, submit: true })).toMatchObject({ ok: false, savedId: CAMPAIGN_ID, error: { kind: "conflict" } });
  });
});

describe("input and ownership", () => {
  it("refuses unknown fields (owner, status, reviewer) before any API call", async () => {
    const fake = upstream({});
    for (const extra of [{ brandId: "other" }, { status: "open" }, { reviewedBy: "me" }, { reviewNote: "approved" }, { id: "x" }]) {
      const result = await actions.saveCampaignAction({ id: null, campaign: { ...BODY, ...extra }, submit: false });
      expect(result).toMatchObject({ ok: false, error: { kind: "validation" } });
    }
    expect(await actions.saveCampaignAction({ id: null, campaign: BODY, submit: false, brandId: "other" })).toMatchObject({ ok: false });
    expect(fake.keys().filter((k) => k !== "GET /auth/me")).toEqual([]);
  });

  it("refuses an id that is not a UUID, so nothing odd is ever put into a path", async () => {
    const fake = upstream({});
    for (const id of ["../admin", "abc", "123", "<script>", `${CAMPAIGN_ID}/submit`, `${CAMPAIGN_ID}?x=1`]) {
      expect(await actions.saveCampaignAction({ id, campaign: BODY, submit: false })).toMatchObject({ ok: false });
      expect(await actions.transitionCampaignAction({ id, kind: "cancel" })).toMatchObject({ ok: false });
    }
    expect(fake.keys().filter((k) => k !== "GET /auth/me")).toEqual([]);
  });

  it("another brand's campaign answers 'not found' (the API treats it exactly like a missing one)", async () => {
    upstream({ [`PATCH ${BASE}/${CAMPAIGN_ID}`]: jsonResponse(404, errorBody("not_found", "Campaign not found")), [`POST ${BASE}/${CAMPAIGN_ID}/cancel`]: jsonResponse(404, errorBody("not_found", "Campaign not found")) });
    expect(await actions.saveCampaignAction({ id: CAMPAIGN_ID, campaign: BODY, submit: false })).toEqual({ ok: false, savedId: null, error: { kind: "not_found" } });
    expect(await actions.transitionCampaignAction({ id: CAMPAIGN_ID, kind: "cancel" })).toEqual({ ok: false, error: { kind: "not_found" } });
  });

  it.each([
    ["a creator", { role: "creator" }],
    ["a pending creator", { role: "creator", status: "pending" }],
    ["an administrator", { role: "admin", phone: null }],
    ["a suspended brand", { role: "brand", status: "suspended" }],
  ])("refuses %s without calling the campaign API", async (_name, user) => {
    const fake = routeFetch({ "GET /auth/me": me(user) });
    vi.stubGlobal("fetch", fake.fetch);
    expect(await actions.saveCampaignAction({ id: null, campaign: BODY, submit: true })).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    expect(await actions.transitionCampaignAction({ id: CAMPAIGN_ID, kind: "delete" })).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    expect(fake.keys().every((k) => k === "GET /auth/me")).toBe(true);
  });
});

describe("expired sessions", () => {
  it("without a cookie nothing is sent", async () => {
    nextState.cookies.clear();
    const fake = upstream({});
    expect(await actions.saveCampaignAction({ id: null, campaign: BODY, submit: false })).toEqual({ ok: false, savedId: null, error: { kind: "unauthenticated" } });
    expect(fake.calls).toHaveLength(0);
  });

  it("a session the API no longer accepts says so and leaves the cookie alone (so the page keeps the form)", async () => {
    const fake = routeFetch({ "GET /auth/me": jsonResponse(401, errorBody("unauthorized")) });
    vi.stubGlobal("fetch", fake.fetch);
    expect(await actions.saveCampaignAction({ id: null, campaign: BODY, submit: true })).toMatchObject({ ok: false, error: { kind: "unauthenticated" } });
    expect(nextState.deletes).toEqual([]);
  });

  it("a session that ends during the call is also reported", async () => {
    upstream({ [`POST ${BASE}`]: jsonResponse(401, errorBody("unauthorized")) });
    expect(await actions.saveCampaignAction({ id: null, campaign: BODY, submit: false })).toMatchObject({ ok: false, error: { kind: "unauthenticated" } });
  });
});

describe("failures are never reported as saved", () => {
  it.each([
    { label: "network failure", answer: new TypeError("fetch failed") },
    { label: "server error", answer: jsonResponse(500, errorBody("internal_error")) },
    { label: "malformed answer", answer: jsonResponse(200, { nodata: 1 }) },
    { label: "unexpected shape", answer: jsonResponse(201, { data: { campaign: { id: "not-a-uuid" } } }) },
  ])("a $label on create is unavailable and nothing is claimed saved", async ({ answer }) => {
    upstream({ [`POST ${BASE}`]: answer });
    expect(await actions.saveCampaignAction({ id: null, campaign: BODY, submit: true })).toMatchObject({ ok: false, savedId: null, error: { kind: "unavailable" } });
  });

  it("a rate limit carries the wait time", async () => {
    upstream({ [`POST ${BASE}`]: jsonResponse(429, errorBody("rate_limited"), { "retry-after": "120" }) });
    expect(await actions.saveCampaignAction({ id: null, campaign: BODY, submit: false })).toMatchObject({ error: { kind: "rate_limited", retryAfterSeconds: 120 } });
  });

  it("never logs or returns the session value", async () => {
    const spies = [vi.spyOn(console, "error"), vi.spyOn(console, "warn"), vi.spyOn(console, "log")].map((s) => s.mockImplementation(() => undefined));
    upstream({ [`POST ${BASE}`]: new TypeError("boom") });
    const result = await actions.saveCampaignAction({ id: null, campaign: BODY, submit: false });
    expect(JSON.stringify(result)).not.toContain("AbCdEf0123456789");
    for (const spy of spies) expect(JSON.stringify(spy.mock.calls)).not.toContain("AbCdEf0123456789");
  });
});

describe("lifecycle actions", () => {
  it("submits a draft and returns the real status", async () => {
    const fake = upstream({ [`POST ${BASE}/${CAMPAIGN_ID}/submit`]: one(campaignView({ status: "pending_review" })) });
    expect(await actions.transitionCampaignAction({ id: CAMPAIGN_ID, kind: "submit" })).toMatchObject({ ok: true, deleted: false, campaign: { status: "pending_review" } });
    expect(fake.keys()).toContain(`POST ${BASE}/${CAMPAIGN_ID}/submit`);
  });

  it("cancels (withdraws) and returns the real status", async () => {
    upstream({ [`POST ${BASE}/${CAMPAIGN_ID}/cancel`]: one(campaignView({ status: "cancelled", cancelledAt: "2026-10-19T12:00:00.000Z" })) });
    expect(await actions.transitionCampaignAction({ id: CAMPAIGN_ID, kind: "cancel" })).toMatchObject({ ok: true, campaign: { status: "cancelled" } });
  });

  it("deletes a draft", async () => {
    upstream({ [`DELETE ${BASE}/${CAMPAIGN_ID}`]: jsonResponse(200, { data: { id: CAMPAIGN_ID, deleted: true } }) });
    expect(await actions.transitionCampaignAction({ id: CAMPAIGN_ID, kind: "delete" })).toEqual({ ok: true, campaign: null, deleted: true });
  });

  it.each([
    ["cancel", "campaign_has_active_offers", /Creators have already responded/],
    ["delete", "campaign_not_deletable", /Only a draft can be deleted/],
    ["submit", "campaign_not_draft", /already been submitted/],
  ] as const)("a refused %s (%s) is reported in plain language", async (kind, code, message) => {
    const path = kind === "delete" ? `DELETE ${BASE}/${CAMPAIGN_ID}` : `POST ${BASE}/${CAMPAIGN_ID}/${kind}`;
    upstream({ [path]: jsonResponse(409, errorBody(code, "raw message with pending_review")) });
    const result = await actions.transitionCampaignAction({ id: CAMPAIGN_ID, kind });
    expect(result).toMatchObject({ ok: false, error: { kind: "conflict", message: expect.stringMatching(message) } });
  });

  it("refuses unknown actions and extra fields", async () => {
    const fake = upstream({});
    expect(await actions.transitionCampaignAction({ id: CAMPAIGN_ID, kind: "approve" })).toMatchObject({ ok: false });
    expect(await actions.transitionCampaignAction({ id: CAMPAIGN_ID, kind: "cancel", status: "open" })).toMatchObject({ ok: false });
    expect(fake.keys().filter((k) => k !== "GET /auth/me")).toEqual([]);
  });
});
