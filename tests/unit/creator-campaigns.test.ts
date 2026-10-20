import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiConfigForTests } from "@/lib/api/config";
import { ApiError } from "@/lib/api/errors";
import { BUDGETS, applicationToApi, campaignsHref, parseCampaignQuery, parsePrice, toApiQuery, validateApplication } from "@/features/creator/campaigns/query";
import { applyFailureFrom, applyFailureNotice } from "@/features/creator/campaigns/failure";
import { applyInputSchema, withdrawInputSchema } from "@/features/creator/campaigns/schemas";
import { CAMPAIGN_ID, OFFER_ID, TEST_CONFIG, TOKEN, apiUser, creatorCampaign, errorBody, jsonResponse, offerView, routeFetch } from "../helpers";
import { nextState, resetNextState } from "../mocks/next";

vi.mock("next/headers", async () => (await import("../mocks/next")).headersModule);
vi.mock("next/navigation", async () => (await import("../mocks/next")).navigationModule);
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

const actions = await import("@/features/creator/campaigns/actions");
const server = await import("@/features/creator/campaigns/server");

const me = (user: Record<string, unknown> = {}) => jsonResponse(200, { data: { user: apiUser({ role: "creator", ...user }), session: { expiresAt: "2026-12-31T00:00:00.000Z" } } });
const APPLY = `POST /creator/campaigns/${CAMPAIGN_ID}/offers`;
const CAMPAIGN = `GET /creator/campaigns/${CAMPAIGN_ID}`;
const WITHDRAW = `POST /creator/offers/${OFFER_ID}/withdraw`;
const INPUT = { campaignId: CAMPAIGN_ID, platform: "instagram", priceXaf: 85_000, pitch: "I would make three honest reels." };
const calls = (fake: ReturnType<typeof routeFetch>) => fake.keys().filter((k) => k !== "GET /auth/me");
const application = (over = {}) => offerView({ origin: "campaign_match", initiator: "creator", hire: null, pitch: INPUT.pitch, priceXaf: 85_000, platform: { code: "instagram", name: "Instagram" }, ...over });

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

describe("browse query", () => {
  it("keeps valid values and drops everything else", () => {
    expect(parseCampaignQuery({ q: " glow ", sort: "budget", niche: ["beauty", "Bad;Slug"], city: "douala", budget: "100000-500000", eligible: "true", cursor: "abc_-=" })).toEqual({ q: "glow", sort: "budget", niche: ["beauty"], city: ["douala"], budget: "100000-500000", eligibleOnly: true, cursor: "abc_-=" });
    expect(parseCampaignQuery({ q: "x", sort: "password", niche: "../x", city: ["a b"], budget: "free", eligible: "yes", cursor: "../x?y" })).toEqual({ q: "", sort: "newest", niche: [], city: [], budget: "", eligibleOnly: false });
  });

  it("maps to the API's parameters and round-trips through the URL", () => {
    const query = parseCampaignQuery({ q: "glow", sort: "start_date", niche: "beauty", city: ["douala", "buea"], budget: "0-100000", eligible: "true", cursor: "c1" });
    expect(toApiQuery(query, 12)).toEqual({ limit: 12, sort: "start_date", q: "glow", niche: "beauty", city: "douala,buea", budgetMax: 99_999, eligibleOnly: "true", cursor: "c1" });
    const href = campaignsHref(query);
    const url = new URL(`http://x${href}`);
    const raw: Record<string, string[]> = {};
    for (const key of new Set(url.searchParams.keys())) raw[key] = url.searchParams.getAll(key);
    expect(parseCampaignQuery(raw)).toEqual(query);
    expect(campaignsHref(parseCampaignQuery({}))).toBe("/creator/campaigns");
    const list = Object.values(BUDGETS);
    for (let i = 1; i < list.length; i += 1) expect(list[i]!.min).toBeGreaterThan(list[i - 1]!.max!);
  });
});

describe("applying: checks and request body", () => {
  const ctx = { platforms: ["instagram", "tiktok"], budgetXaf: 200_000 };
  it("parses prices as whole positive XAF", () => {
    expect(parsePrice("85,000")).toBe(85_000);
    expect(parsePrice("85 000 FCFA")).toBe(85_000);
    for (const bad of ["", "0", "-5", "12.5", "1e6", "abc", "9".repeat(13)]) expect(parsePrice(bad), bad).toBeNull();
  });
  it("accepts a good application and reports each problem on its own field", () => {
    expect(validateApplication({ platform: "instagram", price: "85000", pitch: "A pitch long enough." }, ctx)).toEqual({});
    const errors = validateApplication({ platform: "youtube", price: "300000", pitch: "short" }, ctx);
    expect(Object.keys(errors).sort()).toEqual(["pitch", "platform", "price"]);
    expect(errors.price).toMatch(/200,000/);
    expect(validateApplication({ platform: "tiktok", price: "200000", pitch: "x".repeat(500) }, ctx)).toEqual({});
    expect(validateApplication({ platform: "tiktok", price: "200000", pitch: "x".repeat(501) }, ctx).pitch).toBeTruthy();
  });
  it("the body is platform, price and pitch only: no creator, brand, status or date", () => {
    expect(applicationToApi({ platform: "instagram", price: "85,000", pitch: "  My pitch is long.  " })).toEqual({ platform: "instagram", priceXaf: 85_000, pitch: "My pitch is long." });
  });
  it("what the browser may send is a campaign id, a platform code, a whole price and a pitch", () => {
    expect(applyInputSchema.safeParse(INPUT).success).toBe(true);
    for (const extra of [{ creatorId: "x" }, { brandId: "x" }, { status: "accepted" }, { startDate: "2030-01-01" }, { origin: "direct_hire" }]) expect(applyInputSchema.safeParse({ ...INPUT, ...extra }).success, JSON.stringify(extra)).toBe(false);
    for (const bad of [{ campaignId: "../x" }, { platform: "myspace" }, { priceXaf: 12.5 }, { priceXaf: 0 }, { priceXaf: "85000" }]) expect(applyInputSchema.safeParse({ ...INPUT, ...bad }).success, JSON.stringify(bad)).toBe(false);
    expect(withdrawInputSchema.safeParse({ id: OFFER_ID }).success).toBe(true);
    expect(withdrawInputSchema.safeParse({ id: OFFER_ID, status: "withdrawn" }).success).toBe(false);
  });
});

describe("failures", () => {
  const api = (status: number, code: string, details: { path: string; message: string }[] = []) => new ApiError({ status, code, message: `API says ${code}`, requestId: "req-1", details });
  it("explains the API's refusals in plain language", () => {
    expect(applyFailureFrom(api(409, "offer_already_exists"))).toMatchObject({ kind: "conflict", message: expect.stringMatching(/applied to this campaign.*once/) });
    expect(applyFailureFrom(api(403, "profile_required"))).toMatchObject({ kind: "conflict", message: expect.stringMatching(/approved creator profile/) });
    expect(applyFailureFrom(api(422, "price_exceeds_budget", [{ path: "body.priceXaf", message: "too high" }]))).toEqual({ kind: "validation", fields: { price: "too high" }, message: expect.stringMatching(/above the brand's maximum/) });
    expect(applyFailureFrom(api(422, "engagement_below_minimum"))).toMatchObject({ kind: "validation", message: expect.stringMatching(/engagement rate/) });
    expect(applyFailureFrom(api(404, "not_found"))).toEqual({ kind: "not_found" });
    expect(applyFailureFrom(api(401, "unauthorized"))).toEqual({ kind: "unauthenticated" });
    expect(applyFailureFrom(api(500, "x"))).toEqual({ kind: "unavailable", requestId: "req-1" });
  });
  it("a refusal says nothing was sent; a missing campaign explains it may have closed", () => {
    expect(applyFailureNotice({ kind: "validation", fields: {}, message: "Bad." }, "/x").text).toMatch(/Nothing was sent/);
    expect(applyFailureNotice({ kind: "not_found" }, "/x")).toMatchObject({ text: expect.stringMatching(/no longer open.*Nothing was sent/), link: { href: "/creator/campaigns" } });
    expect(applyFailureNotice({ kind: "unauthenticated" }, "/creator/campaigns/x").link?.href).toBe("/sign-in?next=%2Fcreator%2Fcampaigns%2Fx&expired=1");
  });
});

describe("applying (Server Action)", () => {
  it("POSTs platform, price and pitch to that campaign's path and returns the API's own application", async () => {
    const fake = upstream({ [APPLY]: jsonResponse(201, { data: { offer: application() } }) });
    expect(await actions.applyToCampaignAction(INPUT)).toMatchObject({ ok: true, offer: { status: "pending", priceXaf: 85_000 } });
    expect(JSON.parse(String(fake.calls[fake.keys().indexOf(APPLY)]!.init.body))).toEqual({ platform: "instagram", priceXaf: 85_000, pitch: "I would make three honest reels." });
  });

  it("refuses a creator, brand id, status or date, an odd id and a bad pitch length before calling the API", async () => {
    const fake = upstream({});
    for (const extra of [{ creatorId: "x" }, { status: "accepted" }, { startDate: "2030-01-01" }]) expect(await actions.applyToCampaignAction({ ...INPUT, ...extra })).toMatchObject({ ok: false });
    expect(await actions.applyToCampaignAction({ ...INPUT, campaignId: "../x" })).toMatchObject({ ok: false });
    for (const pitch of ["", "too short", "x".repeat(501)]) expect(await actions.applyToCampaignAction({ ...INPUT, pitch })).toMatchObject({ ok: false, error: { kind: "validation" } });
    expect(calls(fake)).toEqual([]);
  });

  it.each([["a brand", { role: "brand" }], ["an administrator", { role: "admin", phone: null }], ["a pending creator", { role: "creator", status: "pending" }], ["a suspended creator", { role: "creator", status: "suspended" }]])("%s cannot apply or withdraw, and the API is not called", async (_n, user) => {
    const fake = upstream({}, user);
    expect(await actions.applyToCampaignAction(INPUT)).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    expect(await actions.withdrawApplicationAction({ id: OFFER_ID })).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    expect(calls(fake)).toEqual([]);
  });

  it("without a cookie nothing is sent; an ended session keeps the cookie; a session ending mid-call is reported", async () => {
    nextState.cookies.clear();
    const fake = upstream({});
    expect(await actions.applyToCampaignAction(INPUT)).toEqual({ ok: false, error: { kind: "unauthenticated" } });
    expect(fake.calls).toHaveLength(0);
    nextState.cookies.set("ioh_session", TOKEN);
    vi.stubGlobal("fetch", routeFetch({ "GET /auth/me": jsonResponse(401, errorBody("unauthorized")) }).fetch);
    expect(await actions.applyToCampaignAction(INPUT)).toEqual({ ok: false, error: { kind: "unauthenticated" } });
    expect(nextState.deletes).toEqual([]);
    upstream({ [APPLY]: jsonResponse(401, errorBody("unauthorized")) });
    expect(await actions.applyToCampaignAction(INPUT)).toEqual({ ok: false, error: { kind: "unauthenticated" } });
  });

  it("a campaign that is not open (or not visible) answers 'not found'", async () => {
    upstream({ [APPLY]: jsonResponse(404, errorBody("not_found", "x")) });
    expect(await actions.applyToCampaignAction(INPUT)).toEqual({ ok: false, error: { kind: "not_found" } });
  });

  it.each([["price_below_minimum"], ["price_exceeds_budget"], ["engagement_below_minimum"], ["invalid_platform"]])("422 %s is a validation answer and nothing is claimed sent", async (code) => {
    upstream({ [APPLY]: jsonResponse(422, errorBody(code, "x")) });
    expect(await actions.applyToCampaignAction(INPUT)).toMatchObject({ ok: false, error: { kind: "validation" } });
  });

  it("a duplicate (409) is success only when the campaign shows MY pending application with exactly this pitch, price and platform", async () => {
    const dup = jsonResponse(409, errorBody("offer_already_exists", "x"));
    upstream({ [APPLY]: dup, [CAMPAIGN]: jsonResponse(200, { data: { campaign: creatorCampaign({ myOffer: { id: OFFER_ID, status: "pending" } }) } }), [`GET /creator/offers/${OFFER_ID}`]: jsonResponse(200, { data: { offer: application() } }) });
    expect(await actions.applyToCampaignAction(INPUT)).toMatchObject({ ok: true });
    // an earlier, different application is not the one just sent
    upstream({ [APPLY]: dup, [CAMPAIGN]: jsonResponse(200, { data: { campaign: creatorCampaign({ myOffer: { id: OFFER_ID, status: "pending" } }) } }), [`GET /creator/offers/${OFFER_ID}`]: jsonResponse(200, { data: { offer: application({ pitch: "Something else entirely." }) } }) });
    expect(await actions.applyToCampaignAction(INPUT)).toMatchObject({ ok: false, error: { kind: "conflict", code: "offer_already_exists" } });
    // a withdrawn one can never be re-sent
    upstream({ [APPLY]: dup, [CAMPAIGN]: jsonResponse(200, { data: { campaign: creatorCampaign({ myOffer: { id: OFFER_ID, status: "withdrawn" } }) } }) });
    expect(await actions.applyToCampaignAction(INPUT)).toMatchObject({ ok: false, error: { kind: "conflict" } });
  });

  it.each([{ label: "network failure", answer: new TypeError("fetch failed") }, { label: "server error", answer: jsonResponse(500, errorBody("internal_error")) }, { label: "malformed answer", answer: jsonResponse(201, { data: { offer: { id: "nope" } } }) }])("a $label is 'unavailable', never 'sent'", async ({ answer }) => {
    upstream({ [APPLY]: answer });
    expect(await actions.applyToCampaignAction(INPUT)).toMatchObject({ ok: false, error: { kind: "unavailable" } });
  });
});

describe("withdrawing (Server Action)", () => {
  it("POSTs an empty body to that application and reports the API's answer", async () => {
    const fake = upstream({ [WITHDRAW]: jsonResponse(200, { data: { offer: application({ status: "withdrawn" }) } }) });
    expect(await actions.withdrawApplicationAction({ id: OFFER_ID })).toMatchObject({ ok: true, offer: { status: "withdrawn" } });
    expect(JSON.parse(String(fake.calls[fake.keys().indexOf(WITHDRAW)]!.init.body))).toEqual({});
  });
  it("someone else's application is 'not found'; an answered one is a conflict; a repeat is success only if it now reads withdrawn", async () => {
    upstream({ [WITHDRAW]: jsonResponse(404, errorBody("not_found", "x")) });
    expect(await actions.withdrawApplicationAction({ id: OFFER_ID })).toEqual({ ok: false, error: { kind: "not_found" } });
    upstream({ [WITHDRAW]: jsonResponse(409, errorBody("offer_not_pending", "x")), [`GET /creator/offers/${OFFER_ID}`]: jsonResponse(200, { data: { offer: application({ status: "accepted" }) } }) });
    expect(await actions.withdrawApplicationAction({ id: OFFER_ID })).toMatchObject({ ok: false, error: { kind: "conflict", code: "offer_not_pending" } });
    upstream({ [WITHDRAW]: jsonResponse(409, errorBody("offer_not_pending", "x")), [`GET /creator/offers/${OFFER_ID}`]: jsonResponse(200, { data: { offer: application({ status: "withdrawn" }) } }) });
    expect(await actions.withdrawApplicationAction({ id: OFFER_ID })).toMatchObject({ ok: true });
  });
  it("refuses extra fields and odd ids", async () => {
    const fake = upstream({});
    expect(await actions.withdrawApplicationAction({ id: "../x" })).toMatchObject({ ok: false });
    expect(await actions.withdrawApplicationAction({ id: OFFER_ID, status: "withdrawn" })).toMatchObject({ ok: false });
    expect(calls(fake)).toEqual([]);
  });
});

describe("loading (server side)", () => {
  it("passes only validated parameters; a failure is thrown, never an empty list", async () => {
    const fake = upstream({ "GET /creator/campaigns": jsonResponse(200, { data: [creatorCampaign()], meta: { nextCursor: "n1", limit: 12 } }) });
    expect(await server.loadCampaigns(parseCampaignQuery({ q: "glow", evil: "1" }))).toEqual({ items: [expect.objectContaining({ id: CAMPAIGN_ID })], nextCursor: "n1" });
    expect(Object.fromEntries(new URL(fake.calls[fake.keys().indexOf("GET /creator/campaigns")]!.url).searchParams)).toEqual({ limit: "12", sort: "newest", q: "glow" });
    upstream({ "GET /creator/campaigns": jsonResponse(500, errorBody("internal_error")) });
    await expect(server.loadCampaigns(parseCampaignQuery({}))).rejects.toBeTruthy();
  });
  it("a campaign that isn't open, or an odd id, is 'not found' (the odd id is never sent); an ended session redirects to sign-in", async () => {
    const fake = upstream({});
    await expect(server.loadCampaign("../x")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(calls(fake)).toEqual([]);
    upstream({ [CAMPAIGN]: jsonResponse(404, errorBody("not_found", "x")) });
    await expect(server.loadCampaign(CAMPAIGN_ID)).rejects.toThrow("NEXT_NOT_FOUND");
    upstream({ [CAMPAIGN]: jsonResponse(401, errorBody("unauthorized")) });
    await expect(server.loadCampaign(CAMPAIGN_ID)).rejects.toMatchObject({ url: expect.stringContaining("/sign-in?next=%2Fcreator%2Fcampaigns") });
  });
});
