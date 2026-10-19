import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiConfigForTests } from "@/lib/api/config";
import { OFFER_ID, TEST_CONFIG, TOKEN, apiUser, brandOfferView, errorBody, jsonResponse, offerView, routeFetch } from "../helpers";
import { nextState, resetNextState } from "../mocks/next";

vi.mock("next/headers", async () => (await import("../mocks/next")).headersModule);
vi.mock("next/navigation", async () => (await import("../mocks/next")).navigationModule);
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

const actions = await import("@/features/offers/actions");

const me = (user: Record<string, unknown> = {}) => jsonResponse(200, { data: { user: apiUser(user), session: { expiresAt: "2026-12-31T00:00:00.000Z" } } });
const one = (offer: unknown, status = 200) => jsonResponse(status, { data: { offer } });
const VALUES = { fullName: "Jane Brand", location: "Douala, Cameroon", socialHandle: "acme", promotion: "", platform: "tiktok", paymentMethod: "mtn_momo", duration: "1-week" } as const;
const HIRE = { username: "kevin.fitness", values: VALUES };
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

describe("sending a hire request", () => {
  it("POSTs exactly the API's fields (creator by username) and returns the API's own offer", async () => {
    const fake = upstream({ "POST /brand/offers": one(brandOfferView(), 201) });
    const result = await actions.submitHireAction(HIRE);
    expect(result).toMatchObject({ ok: true, offer: { id: OFFER_ID, status: "pending", priceXaf: 30000 } });
    const sent = JSON.parse(String(fake.calls[fake.keys().indexOf("POST /brand/offers")]!.init.body));
    expect(sent).toEqual({ creator: "kevin.fitness", platform: "tiktok", duration: "1-week", paymentMethod: "mtn_momo", contactName: "Jane Brand", location: "Douala, Cameroon", socialHandle: "@acme" });
    expect(sent).not.toHaveProperty("priceXaf");
  });

  it("refuses a price, status, brand id or any unknown field before calling the API", async () => {
    const fake = upstream({});
    for (const extra of [{ priceXaf: 1 }, { status: "accepted" }, { brandId: "x" }, { creatorId: "x" }]) {
      expect(await actions.submitHireAction({ ...HIRE, values: { ...VALUES, ...extra } })).toMatchObject({ ok: false, error: { kind: "validation" } });
    }
    expect(await actions.submitHireAction({ ...HIRE, extra: 1 })).toMatchObject({ ok: false });
    expect(calls(fake)).toEqual([]);
  });

  it("refuses a username that could alter the request, and a platform, method or duration the API does not know", async () => {
    const fake = upstream({});
    for (const username of ["../admin", "a b", "x", "kevin.fitness/offers", "k".repeat(31)]) expect(await actions.submitHireAction({ ...HIRE, username })).toMatchObject({ ok: false });
    for (const values of [{ ...VALUES, platform: "myspace" }, { ...VALUES, paymentMethod: "Bank transfer" }, { ...VALUES, duration: "1 week" }]) expect(await actions.submitHireAction({ ...HIRE, values })).toMatchObject({ ok: false });
    expect(calls(fake)).toEqual([]);
  });

  it("reports the API's field errors and says nothing was sent", async () => {
    upstream({ "POST /brand/offers": jsonResponse(422, errorBody("duration_below_minimum", "x", { details: [{ path: "body.duration", message: "shorter than the minimum booking" }] })) });
    expect(await actions.submitHireAction(HIRE)).toEqual({ ok: false, error: expect.objectContaining({ kind: "validation", fields: { duration: "shorter than the minimum booking" } }) });
  });

  it("a duplicate pending hire (409) is reported as a conflict, never as success", async () => {
    upstream({ "POST /brand/offers": jsonResponse(409, errorBody("hire_already_pending", "x")) });
    expect(await actions.submitHireAction(HIRE)).toMatchObject({ ok: false, error: { kind: "conflict", code: "hire_already_pending" } });
  });

  it("an unknown creator is 'not found'", async () => {
    upstream({ "POST /brand/offers": jsonResponse(404, errorBody("not_found", "x")) });
    expect(await actions.submitHireAction(HIRE)).toEqual({ ok: false, error: { kind: "not_found" } });
  });

  it.each([
    { label: "network failure", answer: new TypeError("fetch failed") },
    { label: "server error", answer: jsonResponse(500, errorBody("internal_error")) },
    { label: "malformed answer", answer: jsonResponse(201, { data: { offer: { id: "not-a-uuid" } } }) },
  ])("a $label is unavailable and nothing is claimed sent", async ({ answer }) => {
    upstream({ "POST /brand/offers": answer });
    expect(await actions.submitHireAction(HIRE)).toMatchObject({ ok: false, error: { kind: "unavailable" } });
  });
});

describe("who may do what", () => {
  it.each([
    ["a creator", { role: "creator" }],
    ["an administrator", { role: "admin", phone: null }],
    ["a suspended brand", { role: "brand", status: "suspended" }],
  ])("%s cannot send a hire request or decide an offer, and the API is not called", async (_name, user) => {
    const fake = upstream({}, user);
    expect(await actions.submitHireAction(HIRE)).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    expect(await actions.decideOfferAction({ id: OFFER_ID, kind: "cancel" })).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    expect(calls(fake)).toEqual([]);
  });

  it.each([
    ["a brand", { role: "brand" }],
    ["a pending creator", { role: "creator", status: "pending" }],
    ["an administrator", { role: "admin", phone: null }],
  ])("%s cannot answer a creator's offer, and the API is not called", async (_name, user) => {
    const fake = upstream({}, user);
    expect(await actions.answerOfferAction({ kind: "accept", id: OFFER_ID, startDate: null })).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    expect(calls(fake)).toEqual([]);
  });

  it("without a session cookie nothing is sent; a session the API no longer accepts keeps the cookie so the page keeps the form", async () => {
    nextState.cookies.clear();
    const fake = upstream({});
    expect(await actions.submitHireAction(HIRE)).toEqual({ ok: false, error: { kind: "unauthenticated" } });
    expect(fake.calls).toHaveLength(0);
    nextState.cookies.set("ioh_session", TOKEN);
    vi.stubGlobal("fetch", routeFetch({ "GET /auth/me": jsonResponse(401, errorBody("unauthorized")) }).fetch);
    expect(await actions.answerOfferAction({ kind: "accept", id: OFFER_ID, startDate: null })).toEqual({ ok: false, error: { kind: "unauthenticated" } });
    expect(nextState.deletes).toEqual([]);
  });

  it("a session that ends during the call is reported", async () => {
    upstream({ "POST /brand/offers": jsonResponse(401, errorBody("unauthorized")) });
    expect(await actions.submitHireAction(HIRE)).toEqual({ ok: false, error: { kind: "unauthenticated" } });
  });
});

describe("a creator answering an offer", () => {
  const asCreator = (routes: Parameters<typeof routeFetch>[0]) => upstream(routes, { role: "creator" });
  const accept = `POST /creator/offers/${OFFER_ID}/accept`;
  const decline = `POST /creator/offers/${OFFER_ID}/decline`;

  it("accepts with the chosen start date, or with an empty body for the default", async () => {
    const fake = asCreator({ [accept]: one(offerView({ status: "accepted" })) });
    expect(await actions.answerOfferAction({ kind: "accept", id: OFFER_ID, startDate: "2031-05-01" })).toMatchObject({ ok: true, offer: { status: "accepted" } });
    expect(JSON.parse(String(fake.calls[fake.keys().indexOf(accept)]!.init.body))).toEqual({ startDate: "2031-05-01" });
    expect(await actions.answerOfferAction({ kind: "accept", id: OFFER_ID, startDate: null })).toMatchObject({ ok: true });
    expect(JSON.parse(String(fake.calls[fake.keys().lastIndexOf(accept)]!.init.body))).toEqual({});
  });

  it("declines with a reason id from the API's list", async () => {
    const fake = asCreator({ [decline]: one(offerView({ status: "declined" })) });
    expect(await actions.answerOfferAction({ kind: "decline", id: OFFER_ID, reasonId: 2 })).toMatchObject({ ok: true, offer: { status: "declined" } });
    expect(JSON.parse(String(fake.calls[fake.keys().indexOf(decline)]!.init.body))).toEqual({ reasonId: 2 });
  });

  it("refuses a decline without a valid reason, an impossible date and unknown fields before calling the API", async () => {
    const fake = asCreator({});
    for (const input of [
      { kind: "decline", id: OFFER_ID },
      { kind: "decline", id: OFFER_ID, reasonId: 0 },
      { kind: "decline", id: OFFER_ID, reasonId: "2" },
      { kind: "accept", id: OFFER_ID, startDate: "2031-02-30" },
      { kind: "accept", id: OFFER_ID, startDate: null, priceXaf: 1 },
      { kind: "accept", id: OFFER_ID, startDate: null, status: "accepted" },
      { kind: "accept", id: "../x", startDate: null },
      { kind: "withdraw", id: OFFER_ID },
    ]) {
      expect(await actions.answerOfferAction(input), JSON.stringify(input)).toMatchObject({ ok: false });
    }
    expect(calls(fake)).toEqual([]);
  });

  it("another creator's offer answers 'not found'", async () => {
    asCreator({ [accept]: jsonResponse(404, errorBody("not_found", "Offer not found")) });
    expect(await actions.answerOfferAction({ kind: "accept", id: OFFER_ID, startDate: null })).toEqual({ ok: false, error: { kind: "not_found" } });
  });

  it("capacity, expiry and brand problems are explained and never reported as accepted", async () => {
    for (const code of ["creator_capacity_exceeded", "hire_expired", "brand_not_active", "campaign_not_open"]) {
      asCreator({ [accept]: jsonResponse(409, errorBody(code, "x")) });
      expect(await actions.answerOfferAction({ kind: "accept", id: OFFER_ID, startDate: null }), code).toMatchObject({ ok: false, error: { kind: "conflict", code } });
    }
  });

  it("a duplicate answer is success only when the offer now holds exactly the requested status", async () => {
    asCreator({ [accept]: jsonResponse(409, errorBody("offer_not_pending", "x")), [`GET /creator/offers/${OFFER_ID}`]: one(offerView({ status: "accepted" })) });
    expect(await actions.answerOfferAction({ kind: "accept", id: OFFER_ID, startDate: null })).toMatchObject({ ok: true, offer: { status: "accepted" } });
    asCreator({ [accept]: jsonResponse(409, errorBody("offer_not_pending", "x")), [`GET /creator/offers/${OFFER_ID}`]: one(offerView({ status: "declined" })) });
    expect(await actions.answerOfferAction({ kind: "accept", id: OFFER_ID, startDate: null })).toMatchObject({ ok: false, error: { kind: "conflict", code: "offer_not_pending" } });
    asCreator({ [accept]: jsonResponse(409, errorBody("offer_not_pending", "x")), [`GET /creator/offers/${OFFER_ID}`]: jsonResponse(500, errorBody("internal_error")) });
    expect(await actions.answerOfferAction({ kind: "accept", id: OFFER_ID, startDate: null })).toMatchObject({ ok: false, error: { kind: "conflict" } });
  });

  it("a failed answer can be retried with the same input", async () => {
    let attempt = 0;
    asCreator({ [accept]: () => (++attempt === 1 ? jsonResponse(503, errorBody("request_timeout")) : one(offerView({ status: "accepted" }))) });
    expect(await actions.answerOfferAction({ kind: "accept", id: OFFER_ID, startDate: null })).toMatchObject({ ok: false, error: { kind: "unavailable" } });
    expect(await actions.answerOfferAction({ kind: "accept", id: OFFER_ID, startDate: null })).toMatchObject({ ok: true });
  });
});

describe("a brand deciding on an offer", () => {
  it.each([
    ["accept", "accepted"],
    ["decline", "declined"],
    ["cancel", "cancelled"],
  ] as const)("%s calls the matching endpoint on that offer and returns the API's status", async (kind, status) => {
    const key = `POST /brand/offers/${OFFER_ID}/${kind}`;
    const fake = upstream({ [key]: one(brandOfferView({ status })) });
    expect(await actions.decideOfferAction({ id: OFFER_ID, kind })).toMatchObject({ ok: true, offer: { status } });
    expect(calls(fake)).toEqual([key]);
  });

  it("refuses unknown kinds, extra fields and ids that are not UUIDs", async () => {
    const fake = upstream({});
    for (const input of [{ id: OFFER_ID, kind: "fund" }, { id: OFFER_ID, kind: "accept", priceXaf: 1 }, { id: "../admin", kind: "cancel" }, { id: `${OFFER_ID}/accept`, kind: "cancel" }]) {
      expect(await actions.decideOfferAction(input)).toMatchObject({ ok: false });
    }
    expect(calls(fake)).toEqual([]);
  });

  it("another brand's offer answers 'not found'; a non-cancellable offer is a conflict", async () => {
    upstream({ [`POST /brand/offers/${OFFER_ID}/cancel`]: jsonResponse(404, errorBody("not_found", "x")) });
    expect(await actions.decideOfferAction({ id: OFFER_ID, kind: "cancel" })).toEqual({ ok: false, error: { kind: "not_found" } });
    upstream({ [`POST /brand/offers/${OFFER_ID}/cancel`]: jsonResponse(409, errorBody("offer_not_cancellable", "x")) });
    expect(await actions.decideOfferAction({ id: OFFER_ID, kind: "cancel" })).toMatchObject({ ok: false, error: { kind: "conflict", code: "offer_not_cancellable" } });
  });

  it("a duplicate cancel is success when the offer is already cancelled", async () => {
    upstream({ [`POST /brand/offers/${OFFER_ID}/cancel`]: jsonResponse(409, errorBody("offer_not_pending", "x")), [`GET /brand/offers/${OFFER_ID}`]: one(brandOfferView({ status: "cancelled" })) });
    expect(await actions.decideOfferAction({ id: OFFER_ID, kind: "cancel" })).toMatchObject({ ok: true, offer: { status: "cancelled" } });
  });

  it("never logs or returns the session value", async () => {
    const spies = [vi.spyOn(console, "error"), vi.spyOn(console, "warn"), vi.spyOn(console, "log")].map((s) => s.mockImplementation(() => undefined));
    upstream({ "POST /brand/offers": new TypeError("boom") });
    const result = await actions.submitHireAction(HIRE);
    expect(JSON.stringify(result)).not.toContain("AbCdEf0123456789");
    for (const spy of spies) expect(JSON.stringify(spy.mock.calls)).not.toContain("AbCdEf0123456789");
  });
});
