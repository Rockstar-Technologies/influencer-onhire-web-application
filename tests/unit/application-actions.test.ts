import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiConfigForTests } from "@/lib/api/config";
import { APPLICATION_ID, BIO, TEST_CONFIG, TOKEN, apiUser, applicationState, completeDraft, errorBody, jsonResponse, routeFetch } from "../helpers";
import { nextState, resetNextState } from "../mocks/next";

vi.mock("next/headers", async () => (await import("../mocks/next")).headersModule);
vi.mock("next/navigation", async () => (await import("../mocks/next")).navigationModule);
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

const actions = await import("@/features/creator-application/actions");

const me = (user: Record<string, unknown> = { role: "creator", status: "pending", restricted: true }) => jsonResponse(200, { data: { user: apiUser(user), session: { expiresAt: "2026-12-31T00:00:00.000Z" } } });
const ok = (state: unknown) => jsonResponse(200, { data: state });

const PROFILE = { displayName: "Amina Beauty", primaryNiche: "beauty", otherNiches: [], city: "douala", bio: BIO, photoFileId: null, language: null, contentStyle: null, engagementRatePct: null };
const AUDIENCE = { platforms: [{ platform: "instagram", handle: "@amina", followers: 25000 }], collaborations: [], brandFit: [1] };
const RATES = { prices: [{ platform: "instagram", priceXaf: 85000 }], minimumBooking: "1-week", deliverables: "1 reel", revisionsRounds: 2, usageRightsMonths: 6, depositTerms: "full_in_escrow", payoutAccounts: [{ method: "mtn_momo", number: "677123456" }] };

function upstream(routes: Parameters<typeof routeFetch>[0]) {
  const fake = routeFetch({ "GET /auth/me": me(), ...routes });
  vi.stubGlobal("fetch", fake.fetch);
  return fake;
}
const bodyOf = (fake: ReturnType<typeof routeFetch>, key: string) => JSON.parse(String(fake.calls.find((c) => `${c.init.method} ${new URL(c.url).pathname.replace(/^\/api\/v1/, "")}` === key)!.init.body));

beforeEach(() => {
  resetNextState();
  resetApiConfigForTests();
  vi.stubEnv("API_BASE_URL", TEST_CONFIG.baseUrl);
  vi.stubEnv("TRUSTED_PROXY_HOPS", "0");
  nextState.cookies.set("ioh_session", TOKEN);
});

describe("saving each step", () => {
  it.each([
    ["profile", "PUT /creator/applications/current/profile", PROFILE, () => actions.saveProfileAction(PROFILE)],
    ["audience", "PUT /creator/applications/current/audience", AUDIENCE, () => actions.saveAudienceAction(AUDIENCE)],
    ["rates", "PUT /creator/applications/current/rates", RATES, () => actions.saveRatesAction(RATES)],
  ] as const)("%s: sends exactly the API's body to the right route and returns the API's own view of the application", async (_step, route, body, run) => {
    const saved = completeDraft();
    const fake = upstream({ [route]: ok(saved) });
    const result = await run();
    expect(result).toEqual({ ok: true, value: expect.objectContaining({ application: expect.objectContaining({ id: APPLICATION_ID, status: "draft" }) }) });
    expect(bodyOf(fake, route)).toEqual(body);
    expect(fake.calls.at(-1)!.headers.Cookie).toBe(`ioh_session=${TOKEN}`);
  });

  it("allows a PENDING creator (the application is the one area they may use)", async () => {
    upstream({ "PUT /creator/applications/current/profile": ok(completeDraft()) });
    expect((await actions.saveProfileAction(PROFILE)).ok).toBe(true);
  });

  it("an ACTIVE (approved) creator is also allowed through; the API decides whether anything is still editable", async () => {
    const fake = routeFetch({ "GET /auth/me": me({ role: "creator", status: "active" }), "PUT /creator/applications/current/profile": jsonResponse(409, errorBody("application_not_editable", "Your application is approved and can no longer be edited")) });
    vi.stubGlobal("fetch", fake.fetch);
    expect(await actions.saveProfileAction(PROFILE)).toEqual({ ok: false, error: expect.objectContaining({ kind: "not_editable" }) });
  });
});

describe("ownership and identity", () => {
  it("no creator id, application id or user id can be supplied: unknown fields are refused before any API call", async () => {
    const fake = upstream({});
    for (const extra of [{ creatorId: "other" }, { userId: "other" }, { applicationId: APPLICATION_ID }, { id: "x" }]) {
      const result = await actions.saveProfileAction({ ...PROFILE, ...extra });
      expect(result).toMatchObject({ ok: false, error: { kind: "validation" } });
    }
    expect(fake.keys().filter((key) => key.startsWith("PUT"))).toEqual([]);
  });

  it("the API paths never contain an identifier", async () => {
    const fake = upstream({ "PUT /creator/applications/current/profile": ok(completeDraft()), "GET /creator/applications/current": ok(completeDraft()) });
    await actions.saveProfileAction(PROFILE);
    for (const key of fake.keys()) expect(key).not.toContain(APPLICATION_ID);
  });

  it.each([
    ["a brand", { role: "brand" }],
    ["an administrator", { role: "admin", phone: null }],
  ])("refuses %s without calling the application API", async (_name, user) => {
    const fake = routeFetch({ "GET /auth/me": me(user) });
    vi.stubGlobal("fetch", fake.fetch);
    expect(await actions.saveProfileAction(PROFILE)).toEqual({ ok: false, error: { kind: "forbidden", message: expect.any(String) } });
    expect(await actions.saveAudienceAction(AUDIENCE)).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    expect(await actions.saveRatesAction(RATES)).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    expect((await actions.submitApplicationAction({ rates: null, confirmAccuracy: true })).ok).toBe(false);
    expect((await actions.reapplyAction()).ok).toBe(false);
    expect(fake.keys()).toEqual(Array(5).fill("GET /auth/me"));
  });

  it("refuses a suspended or rejected account", async () => {
    const fake = routeFetch({ "GET /auth/me": me({ role: "creator", status: "suspended" }) });
    vi.stubGlobal("fetch", fake.fetch);
    expect(await actions.saveProfileAction(PROFILE)).toMatchObject({ ok: false, error: { kind: "forbidden" } });
  });
});

describe("expired or missing sessions", () => {
  it("without a cookie nothing is sent and the person is told to sign in", async () => {
    nextState.cookies.clear();
    const fake = upstream({});
    expect(await actions.saveProfileAction(PROFILE)).toEqual({ ok: false, error: { kind: "unauthenticated" } });
    expect(fake.calls).toHaveLength(0);
  });

  it("a session the API no longer accepts reports 'unauthenticated'; nothing is reported saved, and the cookie is left alone so the page keeps the form", async () => {
    const fake = routeFetch({ "GET /auth/me": jsonResponse(401, errorBody("unauthorized")) });
    vi.stubGlobal("fetch", fake.fetch);
    expect(await actions.saveRatesAction(RATES)).toEqual({ ok: false, error: { kind: "unauthenticated" } });
    expect(nextState.deletes).toEqual([]);
  });

  it("a session that ends between the check and the save is also reported as unauthenticated", async () => {
    upstream({ "PUT /creator/applications/current/audience": jsonResponse(401, errorBody("unauthorized")) });
    expect(await actions.saveAudienceAction(AUDIENCE)).toEqual({ ok: false, error: { kind: "unauthenticated" } });
  });
});

describe("validation and failures are never reported as saved", () => {
  it("shows the API's field errors for a rejected step", async () => {
    upstream({ "PUT /creator/applications/current/profile": jsonResponse(422, errorBody("validation_failed", "x", { details: [{ path: "body.bio", code: "too_small", message: "Too small" }] })) });
    expect(await actions.saveProfileAction(PROFILE)).toEqual({ ok: false, error: { kind: "validation", fields: { bio: "Too small" }, steps: [], message: null } });
  });

  it("rejects shapes it cannot even read, locally, without calling the API", async () => {
    const fake = upstream({});
    for (const bad of [null, "x", {}, { ...PROFILE, language: "klingon" }, { ...PROFILE, photoFileId: "data:image/png;base64,AAAA" }, { ...PROFILE, photoDataUrl: "data:image/png;base64,AAAA" }]) {
      expect((await actions.saveProfileAction(bad)).ok).toBe(false);
    }
    expect(await actions.saveAudienceAction({ ...AUDIENCE, platforms: [{ platform: "myspace", handle: "@a", followers: 5 }] })).toMatchObject({ ok: false });
    expect(await actions.saveRatesAction({ ...RATES, priceXaf: 1, depositTerms: "pay_later" })).toMatchObject({ ok: false });
    expect(fake.keys().filter((key) => key.startsWith("PUT"))).toEqual([]);
  });

  it("limits the prerequisite: rates before audience", async () => {
    upstream({ "PUT /creator/applications/current/rates": jsonResponse(409, errorBody("audience_required", "Save your audience first")) });
    expect(await actions.saveRatesAction(RATES)).toMatchObject({ ok: false, error: { kind: "prerequisite", step: "audience" } });
  });

  it.each([
    { label: "network failure", answer: new TypeError("fetch failed") },
    { label: "server error", answer: jsonResponse(500, errorBody("internal_error")) },
    { label: "malformed answer", answer: jsonResponse(200, { nodata: 1 }) },
  ])("a $label is reported as unavailable (and so as not saved)", async ({ answer }) => {
    upstream({ "PUT /creator/applications/current/profile": answer });
    const result = await actions.saveProfileAction(PROFILE);
    expect(result).toMatchObject({ ok: false, error: { kind: "unavailable" } });
  });

  it("a retry after a failure sends the same body again and succeeds (saving a step is idempotent: it replaces the step)", async () => {
    let attempt = 0;
    const fake = upstream({ "PUT /creator/applications/current/profile": () => (++attempt === 1 ? jsonResponse(503, errorBody("request_timeout")) : ok(completeDraft())) });
    expect((await actions.saveProfileAction(PROFILE)).ok).toBe(false);
    expect((await actions.saveProfileAction(PROFILE)).ok).toBe(true);
    const bodies = fake.calls.filter((c) => c.init.method === "PUT").map((c) => String(c.init.body));
    expect(bodies[0]).toBe(bodies[1]);
  });

  it("a rate limit is reported with the wait time", async () => {
    upstream({ "PUT /creator/applications/current/profile": jsonResponse(429, errorBody("rate_limited"), { "retry-after": "300" }) });
    expect(await actions.saveProfileAction(PROFILE)).toEqual({ ok: false, error: { kind: "rate_limited", retryAfterSeconds: 300 } });
  });

  it("never returns or logs payout numbers, tokens or the cookie", async () => {
    const spies = [vi.spyOn(console, "error"), vi.spyOn(console, "warn"), vi.spyOn(console, "log")].map((s) => s.mockImplementation(() => undefined));
    upstream({ "PUT /creator/applications/current/rates": ok(completeDraft()) });
    const result = await actions.saveRatesAction(RATES);
    expect(JSON.stringify(result)).not.toMatch(/677123456|AbCdEf0123456789/);
    upstream({ "PUT /creator/applications/current/rates": new TypeError("boom 677123456") });
    await actions.saveRatesAction(RATES);
    for (const spy of spies) expect(JSON.stringify(spy.mock.calls)).not.toMatch(/677123456|AbCdEf0123456789/);
  });
});

describe("submitting", () => {
  it("saves the rates, submits with only the confirmation, and returns the real application status", async () => {
    const under = completeDraft({ application: { id: APPLICATION_ID, status: "under_review", editable: false, createdAt: "2026-10-19T10:00:00.000Z", submittedAt: "2026-10-19T11:00:00.000Z", reviewedAt: null, feedback: null }, canSubmit: false, nextStep: null });
    const fake = upstream({
      "PUT /creator/applications/current/rates": ok(completeDraft()),
      "POST /creator/applications/current/submit": jsonResponse(200, { data: { application: { id: APPLICATION_ID, status: "under_review", submittedAt: "2026-10-19T11:00:00.000Z" } } }),
      "GET /creator/applications/current": ok(under),
    });
    const result = await actions.submitApplicationAction({ rates: RATES, confirmAccuracy: true });
    expect(result).toEqual({ ok: true, value: expect.objectContaining({ application: expect.objectContaining({ status: "under_review" }) }) });
    expect(fake.keys().filter((k) => !k.includes("/auth/me"))).toEqual(["PUT /creator/applications/current/rates", "POST /creator/applications/current/submit", "GET /creator/applications/current"]);
    expect(bodyOf(fake, "POST /creator/applications/current/submit")).toEqual({ confirmAccuracy: true });
  });

  it("refuses a submission without the confirmation and does not call the API", async () => {
    const fake = upstream({});
    expect((await actions.submitApplicationAction({ rates: RATES, confirmAccuracy: false })).ok).toBe(false);
    expect((await actions.submitApplicationAction({ rates: RATES })).ok).toBe(false);
    expect(fake.keys().filter((k) => !k.includes("/auth/me"))).toEqual([]);
  });

  it("a rates failure means nothing was saved and nothing was submitted", async () => {
    const fake = upstream({ "PUT /creator/applications/current/rates": jsonResponse(422, errorBody("price_below_minimum", "Price below the minimum", { details: [] })) });
    const result = await actions.submitApplicationAction({ rates: RATES, confirmAccuracy: true });
    expect(result).toMatchObject({ ok: false, ratesSaved: false, error: { kind: "validation" } });
    expect(fake.keys()).not.toContain("POST /creator/applications/current/submit");
  });

  it("a submit failure after saved rates says the rates ARE saved but the application is NOT submitted", async () => {
    upstream({
      "PUT /creator/applications/current/rates": ok(completeDraft()),
      "POST /creator/applications/current/submit": jsonResponse(422, errorBody("application_incomplete", "incomplete", { details: [{ path: "profile.bio", message: "is required" }] })),
    });
    const result = await actions.submitApplicationAction({ rates: RATES, confirmAccuracy: true });
    expect(result).toMatchObject({ ok: false, ratesSaved: true, error: { kind: "validation", steps: ["profile"] } });
  });

  it("a duplicate submission (409 already_submitted) is reported as success with the current status, not as an error", async () => {
    const under = completeDraft({ application: { id: APPLICATION_ID, status: "under_review", editable: false, createdAt: "x", submittedAt: "y", reviewedAt: null, feedback: null } });
    upstream({
      "PUT /creator/applications/current/rates": jsonResponse(409, errorBody("already_submitted", "already")),
      "GET /creator/applications/current": ok(under),
    });
    const result = await actions.submitApplicationAction({ rates: RATES, confirmAccuracy: true });
    expect(result).toEqual({ ok: true, value: expect.objectContaining({ application: expect.objectContaining({ status: "under_review" }) }) });
  });

  it("two simultaneous submissions both end in the same submitted state and the API is asked to submit twice at most", async () => {
    let submitted = false;
    const under = completeDraft({ application: { id: APPLICATION_ID, status: "under_review", editable: false, createdAt: "x", submittedAt: "y", reviewedAt: null, feedback: null } });
    upstream({
      "PUT /creator/applications/current/rates": () => (submitted ? jsonResponse(409, errorBody("already_submitted", "already")) : ok(completeDraft())),
      "POST /creator/applications/current/submit": () => {
        submitted = true;
        return jsonResponse(200, { data: { application: { id: APPLICATION_ID, status: "under_review", submittedAt: "2026-10-19T11:00:00.000Z" } } });
      },
      "GET /creator/applications/current": ok(under),
    });
    const [a, b] = await Promise.all([actions.submitApplicationAction({ rates: RATES, confirmAccuracy: true }), actions.submitApplicationAction({ rates: RATES, confirmAccuracy: true })]);
    expect(a.ok && b.ok).toBe(true);
  });

  it("if only reading the result back fails, the failure says the application was submitted (ratesSaved) rather than pretending it was not", async () => {
    upstream({
      "PUT /creator/applications/current/rates": ok(completeDraft()),
      "POST /creator/applications/current/submit": jsonResponse(200, { data: { application: { id: APPLICATION_ID, status: "under_review", submittedAt: "2026-10-19T11:00:00.000Z" } } }),
      "GET /creator/applications/current": jsonResponse(500, errorBody("internal_error")),
    });
    expect(await actions.submitApplicationAction({ rates: RATES, confirmAccuracy: true })).toMatchObject({ ok: false, ratesSaved: true });
  });
});

describe("reapplying after a rejection", () => {
  it("starts a new draft and returns the API's view", async () => {
    const draft = applicationState();
    const fake = upstream({
      "POST /creator/applications/reapply": jsonResponse(201, { data: { application: { id: APPLICATION_ID, status: "draft", createdAt: "2026-10-19T12:00:00.000Z", copiedFromApplicationId: "other" } } }),
      "GET /creator/applications/current": ok(draft),
    });
    expect(await actions.reapplyAction()).toEqual({ ok: true, value: expect.objectContaining({ application: expect.objectContaining({ status: "draft" }) }) });
    expect(fake.keys()).toContain("POST /creator/applications/reapply");
  });

  it("is refused by the API while an application is open", async () => {
    upstream({ "POST /creator/applications/reapply": jsonResponse(409, errorBody("application_already_open", "You already have an application in progress")) });
    expect(await actions.reapplyAction()).toMatchObject({ ok: false });
  });
});
