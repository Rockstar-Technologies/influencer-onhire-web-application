import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiConfigForTests } from "@/lib/api/config";
import { BUDGET_RANGES, FOLLOWER_RANGES, buildDirectoryHref, buildSearchOptions, parseDirectoryQuery, toApiQuery } from "@/features/public/creators/query";
import { TEST_CONFIG, TOKEN, errorBody, jsonResponse, publicCard, publicFilters, publicProfile, routeFetch } from "../helpers";
import { nextState, resetNextState } from "../mocks/next";
import { publicCardSchema, publicProfileSchema } from "@/lib/api/schemas";

vi.mock("next/headers", async () => (await import("../mocks/next")).headersModule);
vi.mock("next/navigation", async () => (await import("../mocks/next")).navigationModule);
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

const server = await import("@/features/public/creators/server");

beforeEach(() => {
  resetNextState();
  resetApiConfigForTests();
  vi.stubEnv("API_BASE_URL", TEST_CONFIG.baseUrl);
  vi.stubEnv("TRUSTED_PROXY_HOPS", "0");
});

describe("the URL is parsed against what the API accepts; anything else is dropped", () => {
  it("keeps valid values", () => {
    expect(parseDirectoryQuery({ q: "  amina ", sort: "price_asc", niche: ["beauty", "tech"], location: "douala", platform: "instagram", language: "bilingual", followers: "50k-200k", budget: "25000-100000", "success-rate": "90", cursor: "abc_-=" })).toEqual({
      q: "amina",
      sort: "price_asc",
      filters: { niche: ["beauty", "tech"], location: ["douala"], platform: ["instagram"], language: ["bilingual"], followers: ["50k-200k"], budget: ["25000-100000"], "success-rate": ["90"] },
      cursor: "abc_-=",
    });
  });

  it("drops hostile or unknown values instead of forwarding them", () => {
    const parsed = parseDirectoryQuery({ q: "x", sort: "password_hash", niche: ["Beauty; DROP", "a b", "../x", "ok-one"], location: "../../etc", platform: "myspace", language: "klingon", followers: "999", budget: "free", "success-rate": "100", cursor: "../x?y=1", evil: "1", status: "pending" });
    expect(parsed).toEqual({ q: "", sort: "", filters: { niche: ["ok-one"] } });
  });

  it("takes the first of repeated single-value parameters and caps the lists", () => {
    const parsed = parseDirectoryQuery({ q: ["ab", "cd"], sort: ["newest", "price_asc"], followers: ["0-50k", "1m+"], niche: ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"] });
    expect(parsed.q).toBe("ab");
    expect(parsed.sort).toBe("newest");
    expect(parsed.filters.followers).toEqual(["0-50k"]);
    expect(parsed.filters.niche).toHaveLength(6);
  });

  it("a search shorter than 2 or longer than 100 characters is ignored", () => {
    expect(parseDirectoryQuery({ q: "a" }).q).toBe("");
    expect(parseDirectoryQuery({ q: "x".repeat(101) }).q).toBe("");
  });
});

describe("the API query", () => {
  it("maps the interface's filters onto the API's parameters, and only those", () => {
    const api = toApiQuery({ q: "@amina", sort: "top_rated", filters: { niche: ["beauty"], location: ["douala", "yaounde"], platform: ["tiktok"], language: ["english"], followers: ["50k-200k"], budget: ["25000-100000"], "success-rate": ["75"] }, cursor: "c1" }, 12);
    expect(api).toEqual({ limit: 12, q: "amina", sort: "top_rated", niche: "beauty", city: "douala,yaounde", platform: "tiktok", language: "english", followersMin: 50_000, followersMax: 199_999, priceMin: 25_000, priceMax: 99_999, minSuccessRate: 75, cursor: "c1" });
  });

  it("an empty query sends only the page size; the ranges never overlap", () => {
    expect(toApiQuery({ q: "", sort: "", filters: {} }, 12)).toEqual({ limit: 12 });
    for (const ranges of [FOLLOWER_RANGES, BUDGET_RANGES]) {
      const list = Object.values(ranges);
      for (let i = 1; i < list.length; i += 1) expect(list[i]!.min).toBeGreaterThan(list[i - 1]!.max!);
    }
  });

  it("round-trips through the URL, and changing a filter drops the page cursor", () => {
    const href = buildDirectoryHref({ q: "amina", sort: "newest", filters: { niche: ["beauty"], followers: ["1m+"] }, cursor: "c1" });
    expect(href).toBe("/influencers?q=amina&sort=newest&niche=beauty&followers=1m%2B&cursor=c1");
    const back = parseDirectoryQuery(Object.fromEntries(new URL(`http://x${href}`).searchParams));
    expect(back).toEqual({ q: "amina", sort: "newest", filters: { niche: ["beauty"], followers: ["1m+"] }, cursor: "c1" });
    expect(buildDirectoryHref({ q: "", sort: "", filters: {} })).toBe("/influencers");
    expect(buildDirectoryHref({ q: "", sort: "", filters: {}, cursor: "" })).toBe("/influencers");
  });
});

describe("filter options are built from the API", () => {
  it("niches, cities, platforms and languages are the API's own lists; unknown sorts are dropped; empty groups are hidden", () => {
    const options = buildSearchOptions(publicFilters);
    expect(options.sortOptions.map((s) => s.value)).toEqual(["recommended", "top_rated", "price_asc"]);
    const group = (key: string) => options.filterGroups.find((g) => g.key === key)!;
    expect(group("niche").options).toEqual([{ value: "beauty", label: "Beauty" }, { value: "tech", label: "Tech" }]);
    expect(group("location").options.map((o) => o.value)).toEqual(["douala", "yaounde"]);
    expect(group("language").options).toEqual([{ value: "english", label: "English" }, { value: "bilingual", label: "Bilingual" }]);
    expect(buildSearchOptions({ ...publicFilters, niches: [] }).filterGroups.find((g) => g.key === "niche")).toBeUndefined();
    expect(buildSearchOptions({ ...publicFilters, sorts: [] }).sortOptions).toEqual([{ value: "recommended", label: "Recommended" }]);
  });
});

describe("the public response shapes carry only allowlisted fields", () => {
  it("a card with extra private keys is stripped of them", () => {
    const parsed = publicCardSchema.parse({ ...publicCard(), email: "x@y.z", photoFileId: "abc", status: "active", phone: "670000000", userId: "u" });
    expect(Object.keys(parsed).sort()).toEqual(["city", "displayName", "engagementRatePct", "followers", "joinedAt", "language", "niches", "primaryNiche", "rating", "startingPriceXaf", "successRatePct", "username", "verifiedFields"]);
  });

  it("a profile with extra private keys is stripped of them, including nested ones", () => {
    const parsed = publicProfileSchema.parse({ creator: { ...publicProfile(), acceptedPaymentMethods: [{ code: "mtn_momo", name: "MTN" }], photoFileId: "abc", terms: { ...publicProfile().terms, depositTerms: "full_in_escrow" }, metrics: { ...publicProfile().metrics, performance: { concludedEngagements: 3 } } } });
    const text = JSON.stringify(parsed);
    for (const word of ["acceptedPaymentMethods", "photoFileId", "depositTerms", "performance", "concludedEngagements"]) expect(text).not.toContain(word);
  });
});

describe("loading (server side)", () => {
  const list = (items: unknown[], nextCursor: string | null = null) => jsonResponse(200, { data: items, meta: { nextCursor, limit: 12, sort: "recommended" } });
  const calls = (fake: ReturnType<typeof routeFetch>) => fake.calls.map((c) => ({ url: new URL(c.url), headers: new Headers(c.init.headers as HeadersInit) }));

  it("sends NO session even when the visitor has one, and passes only the validated parameters", async () => {
    nextState.cookies.set("ioh_session", TOKEN);
    const fake = routeFetch({ "GET /public/creators": list([publicCard()], "next1") });
    vi.stubGlobal("fetch", fake.fetch);
    const page = await server.loadDirectory(parseDirectoryQuery({ q: "amina", niche: "beauty", evil: "1" }));
    expect(page).toEqual({ items: [expect.objectContaining({ username: "amina.beauty" })], nextCursor: "next1" });
    const [call] = calls(fake);
    expect(call!.headers.get("cookie")).toBeNull();
    expect(JSON.stringify([...call!.headers.entries()])).not.toContain(TOKEN);
    expect(Object.fromEntries(call!.url.searchParams)).toEqual({ limit: "12", q: "amina", niche: "beauty" });
  });

  it("an empty page is an empty list with no cursor; featured asks for the recommended order", async () => {
    const fake = routeFetch({ "GET /public/creators": list([]) });
    vi.stubGlobal("fetch", fake.fetch);
    expect(await server.loadDirectory(parseDirectoryQuery({}))).toEqual({ items: [], nextCursor: null });
    await server.loadFeatured(6);
    expect(Object.fromEntries(calls(fake)[1]!.url.searchParams)).toEqual({ limit: "6", sort: "recommended" });
  });

  it("a failure is thrown to the error page, never shown as an empty directory", async () => {
    for (const answer of [jsonResponse(500, errorBody("internal_error")), jsonResponse(429, errorBody("rate_limited"), { "retry-after": "30" }), new TypeError("fetch failed"), jsonResponse(200, { data: [{ username: 1 }] })]) {
      vi.stubGlobal("fetch", routeFetch({ "GET /public/creators": answer }).fetch);
      await expect(server.loadDirectory(parseDirectoryQuery({}))).rejects.toBeTruthy();
    }
  });

  it("a profile loads without a session; unknown, hidden and 422 answers are 'not found'; other failures are errors", async () => {
    nextState.cookies.set("ioh_session", TOKEN);
    const fake = routeFetch({ "GET /public/creators/amina.beauty": jsonResponse(200, { data: { creator: publicProfile() } }) });
    vi.stubGlobal("fetch", fake.fetch);
    expect((await server.loadPublicProfile("amina.beauty")).displayName).toBe("Amina Beauty");
    expect(calls(fake)[0]!.headers.get("cookie")).toBeNull();
    for (const status of [404, 422]) {
      vi.stubGlobal("fetch", routeFetch({ "GET /public/creators/ghost.user": jsonResponse(status, errorBody(status === 404 ? "not_found" : "validation_failed", "x")) }).fetch);
      await expect(server.loadPublicProfile("ghost.user")).rejects.toThrow("NEXT_NOT_FOUND");
    }
    vi.stubGlobal("fetch", routeFetch({ "GET /public/creators/amina.beauty": jsonResponse(500, errorBody("internal_error")) }).fetch);
    await expect(server.loadPublicProfile("amina.beauty")).rejects.not.toThrow("NEXT_NOT_FOUND");
  });

  it("a username of the wrong shape, or a reserved word, is 'not found' and is never sent", async () => {
    const fake = routeFetch({});
    vi.stubGlobal("fetch", fake.fetch);
    for (const name of ["..", "../admin", "a b", "ab", "x".repeat(31), "filters", "FILTERS", "options", "profile", "a/b", "a?b=1"]) await expect(server.loadPublicProfile(name), name).rejects.toThrow("NEXT_NOT_FOUND");
    expect(fake.calls).toHaveLength(0);
  });

  it("the filter options load without a session", async () => {
    nextState.cookies.set("ioh_session", TOKEN);
    const fake = routeFetch({ "GET /public/creators/filters": jsonResponse(200, { data: publicFilters }) });
    vi.stubGlobal("fetch", fake.fetch);
    expect((await server.loadFilters()).niches).toHaveLength(2);
    expect(calls(fake)[0]!.headers.get("cookie")).toBeNull();
  });
});
