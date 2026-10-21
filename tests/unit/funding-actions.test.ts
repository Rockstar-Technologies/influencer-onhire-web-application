import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiConfigForTests } from "@/lib/api/config";
import { OFFER_ID, TEST_CONFIG, TOKEN, apiUser, errorBody, fundedView, fundingView, jsonResponse, routeFetch } from "../helpers";
import { nextState, resetNextState } from "../mocks/next";

vi.mock("next/headers", async () => (await import("../mocks/next")).headersModule);
vi.mock("next/navigation", async () => (await import("../mocks/next")).navigationModule);
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

const actions = await import("@/features/funding/actions");
const server = await import("@/features/funding/server");

const me = (user: Record<string, unknown> = {}) => jsonResponse(200, { data: { user: apiUser(user), session: { expiresAt: "2026-12-31T00:00:00.000Z" } } });
const FUND = `POST /brand/offers/${OFFER_ID}/fund`;
const STATUS = `GET /brand/offers/${OFFER_ID}/funding`;
const KEY = "fund-0123456789abcdef";
const INPUT = { offerId: OFFER_ID, key: KEY, paymentMethod: "mtn_momo", payerPhone: "+237 677 123 456" };
const funding = (status: number, view: unknown, replayed = false) => jsonResponse(status, { data: { funding: view, replayed } });
const calls = (fake: ReturnType<typeof routeFetch>) => fake.keys().filter((k) => k !== "GET /auth/me");

function upstream(routes: Parameters<typeof routeFetch>[0], user: Record<string, unknown> = {}) {
  const fake = routeFetch({ "GET /auth/me": me(user), ...routes });
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

describe("starting a payment", () => {
  it("POSTs the method and the normalised number with the Idempotency-Key header, and sends no amount, status or id", async () => {
    const fake = upstream({ [FUND]: funding(201, fundedView()) });
    const result = await actions.startFundingAction(INPUT);
    expect(result).toMatchObject({ ok: true, replayed: false, funding: { status: "funded", simulated: true, payment: { reference: "INV-5" } } });
    const call = fake.calls[fake.keys().indexOf(FUND)]!;
    expect(JSON.parse(String(call.init.body))).toEqual({ paymentMethod: "mtn_momo", payerPhone: "677123456" });
    const headers = new Headers(call.init.headers as HeadersInit);
    expect(headers.get("idempotency-key")).toBe(KEY);
    expect(String(call.url)).not.toContain(KEY); // never in the URL
  });

  it("a pending payment is reported as pending, never as paid", async () => {
    upstream({ [FUND]: funding(202, fundingView({ status: "awaiting_confirmation", canStart: false, payment: null })) });
    const result = await actions.startFundingAction(INPUT);
    expect(result).toMatchObject({ ok: true, funding: { status: "awaiting_confirmation", payment: null } });
  });

  it("a replay (same key) is returned as such and the API is asked once per call", async () => {
    const fake = upstream({ [FUND]: funding(200, fundedView(), true) });
    expect(await actions.startFundingAction(INPUT)).toMatchObject({ ok: true, replayed: true });
    expect(calls(fake)).toEqual([FUND]);
  });

  it("refuses an amount, a status, a provider, outcome hints or any extra field before calling the API", async () => {
    const fake = upstream({});
    for (const extra of [{ amountXaf: 1 }, { amount: 1 }, { status: "funded" }, { provider: "fake" }, { outcome: "succeeded" }, { simulate: "auto_succeed" }, { brandId: "x" }]) {
      expect(await actions.startFundingAction({ ...INPUT, ...extra }), JSON.stringify(extra)).toMatchObject({ ok: false, error: { kind: "validation" } });
    }
    expect(calls(fake)).toEqual([]);
  });

  it("refuses an odd offer id, a missing or odd key and an unknown method, sending nothing", async () => {
    const fake = upstream({});
    for (const bad of [{ offerId: "../admin" }, { offerId: `${OFFER_ID}/fund` }, { key: "" }, { key: "short" }, { key: "has spaces in it" }, { paymentMethod: "Bank transfer" }]) {
      expect(await actions.startFundingAction({ ...INPUT, ...bad }), JSON.stringify(bad)).toMatchObject({ ok: false });
    }
    expect(calls(fake)).toEqual([]);
  });

  it("another brand's offer answers 'not found'", async () => {
    upstream({ [FUND]: jsonResponse(404, errorBody("not_found", "Offer not found")) });
    expect(await actions.startFundingAction(INPUT)).toEqual({ ok: false, error: { kind: "not_found" } });
  });

  it.each([
    ["offer_not_fundable"],
    ["funding_deadline_passed"],
    ["funding_expired"],
    ["creator_not_active"],
    ["idempotency_key_reused"],
  ])("409 %s is a conflict and never a success", async (code) => {
    upstream({ [FUND]: jsonResponse(409, errorBody(code, "x")) });
    expect(await actions.startFundingAction(INPUT)).toMatchObject({ ok: false, error: { kind: "conflict", code } });
  });

  it("409 already_funded is success only when a fresh read confirms it is funded", async () => {
    upstream({ [FUND]: jsonResponse(409, errorBody("already_funded", "x")), [STATUS]: jsonResponse(200, { data: { funding: fundedView() } }) });
    expect(await actions.startFundingAction(INPUT)).toMatchObject({ ok: true, replayed: true, funding: { status: "funded" } });
    upstream({ [FUND]: jsonResponse(409, errorBody("already_funded", "x")), [STATUS]: jsonResponse(200, { data: { funding: fundingView({ status: "failed" }) } }) });
    expect(await actions.startFundingAction(INPUT)).toMatchObject({ ok: false, error: { kind: "conflict", code: "already_funded" } });
    upstream({ [FUND]: jsonResponse(409, errorBody("already_funded", "x")), [STATUS]: jsonResponse(500, errorBody("internal_error")) });
    expect(await actions.startFundingAction(INPUT)).toMatchObject({ ok: false, error: { kind: "conflict" } });
  });

  it("409 funding_in_progress shows the current pending state only when the fresh read agrees", async () => {
    upstream({ [FUND]: jsonResponse(409, errorBody("funding_in_progress", "x")), [STATUS]: jsonResponse(200, { data: { funding: fundingView({ status: "awaiting_confirmation", canStart: false }) } }) });
    expect(await actions.startFundingAction(INPUT)).toMatchObject({ ok: true, funding: { status: "awaiting_confirmation" } });
    upstream({ [FUND]: jsonResponse(409, errorBody("funding_in_progress", "x")), [STATUS]: jsonResponse(200, { data: { funding: fundedView() } }) });
    expect(await actions.startFundingAction(INPUT)).toMatchObject({ ok: false, error: { kind: "conflict", code: "funding_in_progress" } });
  });

  it("503 payments_unavailable (no provider) is its own answer, not a fake success", async () => {
    upstream({ [FUND]: jsonResponse(503, errorBody("payments_unavailable", "x")) });
    expect(await actions.startFundingAction(INPUT)).toEqual({ ok: false, error: { kind: "payments_unavailable" } });
  });

  it("422 amount and provider-limit problems are validation errors", async () => {
    upstream({ [FUND]: jsonResponse(422, errorBody("amount_out_of_range", "x")) });
    expect(await actions.startFundingAction(INPUT)).toMatchObject({ ok: false, error: { kind: "validation" } });
  });

  it.each([
    { label: "network failure", answer: new TypeError("fetch failed") },
    { label: "server error", answer: jsonResponse(500, errorBody("internal_error")) },
    { label: "malformed answer", answer: jsonResponse(201, { data: { funding: { status: "paid" }, replayed: false } }) },
    { label: "unknown funding status", answer: funding(201, { ...fundingView(), status: "success" }) },
  ])("a $label is 'unavailable' and is never reported as paid", async ({ answer }) => {
    upstream({ [FUND]: answer });
    expect(await actions.startFundingAction(INPUT)).toMatchObject({ ok: false, error: { kind: "unavailable" } });
  });

  it("a lost answer can be retried with the SAME key and the API replays instead of charging twice", async () => {
    let attempt = 0;
    const fake = upstream({ [FUND]: () => (++attempt === 1 ? jsonResponse(503, errorBody("request_timeout")) : funding(200, fundedView(), true)) });
    expect(await actions.startFundingAction(INPUT)).toMatchObject({ ok: false, error: { kind: "unavailable" } });
    expect(await actions.startFundingAction(INPUT)).toMatchObject({ ok: true, replayed: true });
    const keys = fake.calls.filter((_, i) => fake.keys()[i] === FUND).map((c) => new Headers(c.init.headers as HeadersInit).get("idempotency-key"));
    expect(keys).toEqual([KEY, KEY]);
  });

  it("a 429 carries the wait time", async () => {
    upstream({ [FUND]: jsonResponse(429, errorBody("rate_limited", "x"), { "retry-after": "30" }) });
    expect(await actions.startFundingAction(INPUT)).toMatchObject({ ok: false, error: { kind: "rate_limited", retryAfterSeconds: 30 } });
  });
});

describe("who may pay", () => {
  it.each([
    ["a creator", { role: "creator" }],
    ["an administrator", { role: "admin", phone: null }],
    ["a suspended brand", { role: "brand", status: "suspended" }],
  ])("%s is refused without calling the funding API", async (_n, user) => {
    const fake = upstream({}, user);
    expect(await actions.startFundingAction(INPUT)).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    expect(await actions.refreshFundingAction({ offerId: OFFER_ID })).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    expect(calls(fake)).toEqual([]);
  });

  it("without a cookie nothing is sent; an ended session keeps the cookie; a session ending mid-call is reported", async () => {
    nextState.cookies.clear();
    const fake = upstream({});
    expect(await actions.startFundingAction(INPUT)).toEqual({ ok: false, error: { kind: "unauthenticated" } });
    expect(fake.calls).toHaveLength(0);
    nextState.cookies.set("ioh_session", TOKEN);
    vi.stubGlobal("fetch", routeFetch({ "GET /auth/me": jsonResponse(401, errorBody("unauthorized")) }).fetch);
    expect(await actions.startFundingAction(INPUT)).toEqual({ ok: false, error: { kind: "unauthenticated" } });
    expect(nextState.deletes).toEqual([]);
    upstream({ [FUND]: jsonResponse(401, errorBody("unauthorized")) });
    expect(await actions.startFundingAction(INPUT)).toEqual({ ok: false, error: { kind: "unauthenticated" } });
  });
});

describe("checking the status", () => {
  it("reads the funding state and changes nothing", async () => {
    const fake = upstream({ [STATUS]: jsonResponse(200, { data: { funding: fundedView() } }) });
    expect(await actions.refreshFundingAction({ offerId: OFFER_ID })).toMatchObject({ ok: true, funding: { status: "funded" } });
    expect(calls(fake)).toEqual([STATUS]);
  });
  it("refuses extra fields and odd ids; another brand's offer is 'not found'", async () => {
    const fake = upstream({ [STATUS]: jsonResponse(404, errorBody("not_found", "x")) });
    expect(await actions.refreshFundingAction({ offerId: "../x" })).toMatchObject({ ok: false });
    expect(await actions.refreshFundingAction({ offerId: OFFER_ID, status: "funded" })).toMatchObject({ ok: false });
    expect(calls(fake)).toEqual([]);
    expect(await actions.refreshFundingAction({ offerId: OFFER_ID })).toEqual({ ok: false, error: { kind: "not_found" } });
  });
});

describe("never leaks the session", () => {
  it("is not logged or returned", async () => {
    const spies = [vi.spyOn(console, "error"), vi.spyOn(console, "warn"), vi.spyOn(console, "log")].map((s) => s.mockImplementation(() => undefined));
    upstream({ [FUND]: new TypeError("boom") });
    const result = await actions.startFundingAction(INPUT);
    expect(JSON.stringify(result)).not.toContain("AbCdEf0123456789");
    for (const spy of spies) expect(JSON.stringify(spy.mock.calls)).not.toContain("AbCdEf0123456789");
  });
});

describe("loading (server side)", () => {
  it("loads a payment page's offer and funding together; a malformed id is 'not found' and never sent", async () => {
    const fake = upstream({ [`GET /brand/offers/${OFFER_ID}`]: jsonResponse(200, { data: { offer: (await import("../helpers")).brandOfferView({ status: "accepted" }) } }), [STATUS]: jsonResponse(200, { data: { funding: fundingView() } }) });
    const loaded = await server.loadFundable(OFFER_ID);
    expect(loaded.funding.amountXaf).toBe(250_000);
    expect(calls(fake).sort()).toEqual([STATUS, `GET /brand/offers/${OFFER_ID}`].sort());
    const before = fake.calls.length;
    await expect(server.loadFundable("../admin")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(fake.calls.length).toBe(before);
  });

  it("another brand's offer is 'not found'; an ended session redirects to sign-in and back", async () => {
    upstream({ [`GET /brand/offers/${OFFER_ID}`]: jsonResponse(404, errorBody("not_found", "x")), [STATUS]: jsonResponse(404, errorBody("not_found", "x")) });
    await expect(server.loadFundable(OFFER_ID)).rejects.toThrow("NEXT_NOT_FOUND");
    upstream({ [`GET /brand/offers/${OFFER_ID}`]: jsonResponse(401, errorBody("unauthorized")), [STATUS]: jsonResponse(401, errorBody("unauthorized")) });
    await expect(server.loadFundable(OFFER_ID)).rejects.toMatchObject({ url: expect.stringContaining("/sign-in?next=%2Fbrand%2Foffers") });
  });

  it("funding states for the hires list leave out any state that can't be read instead of guessing", async () => {
    upstream({ [STATUS]: jsonResponse(200, { data: { funding: fundedView() } }), "GET /brand/offers/55555555-5555-4555-8555-555555555555/funding": jsonResponse(500, errorBody("internal_error")) });
    const states = await server.loadFundingStates([OFFER_ID, "55555555-5555-4555-8555-555555555555", "not-an-id"]);
    expect([...states.keys()]).toEqual([OFFER_ID]);
  });

  it("the payments list is paged by a validated cursor", async () => {
    const fake = upstream({ "GET /brand/payments": jsonResponse(200, { data: [], meta: { nextCursor: "abc", limit: 20 } }) });
    expect(await server.loadBrandPayments({ cursor: "../x?y" })).toEqual({ items: [], nextCursor: "abc" });
    expect(new URL(fake.calls[fake.keys().indexOf("GET /brand/payments")]!.url).searchParams.has("cursor")).toBe(false);
  });
});
