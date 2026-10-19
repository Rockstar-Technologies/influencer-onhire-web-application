import type { ApiConfig } from "@/lib/api/config";

export const TOKEN = "AbCdEf0123456789_-AbCdEf0123456789";
export const USER_ID = "11111111-1111-4111-8111-111111111111";

export const TEST_CONFIG: ApiConfig = {
  baseUrl: "http://api.test/api/v1",
  timeoutMs: 1_000,
  maxResponseBytes: 10_000,
  upstreamCookieName: "ioh_session",
  trustedProxyHops: 0,
  appOrigins: ["http://localhost:3000"],
  isProduction: false,
};

export function apiUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: "user@example.com",
    fullName: "Test User",
    phone: "670000001",
    role: "brand",
    status: "active",
    restricted: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function jsonResponse(status: number, body: unknown, extraHeaders: Record<string, string | string[]> = {}): Response {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  for (const [name, value] of Object.entries(extraHeaders)) {
    for (const item of Array.isArray(value) ? value : [value]) headers.append(name, item);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export function errorBody(code: string, message = "Something", extra: Record<string, unknown> = {}) {
  return { error: { code, message, requestId: "req-1234567", ...extra } };
}

export interface RecordedCall {
  url: string;
  init: RequestInit;
  headers: Record<string, string>;
}

/** A fake fetch that records every call and answers from a queue (or a function). */
export function fakeFetch(...answers: Array<Response | Error | ((call: RecordedCall) => Response | Promise<Response>)>) {
  const calls: RecordedCall[] = [];
  const queue = [...answers];
  const impl = (async (input: URL | RequestInfo, init: RequestInit = {}) => {
    const call: RecordedCall = { url: String(input), init, headers: { ...(init.headers as Record<string, string>) } };
    calls.push(call);
    const next = queue.length > 1 ? queue.shift() : queue[0];
    if (next instanceof Error) throw next;
    if (typeof next === "function") return next(call);
    if (!next) throw new Error("fakeFetch: no answer queued");
    // A fresh Response per call (reading a cloned/teed stream would couple the calls together).
    return new Response(await next.clone().text(), { status: next.status, headers: next.headers });
  }) as typeof fetch;
  return { fetch: impl, calls };
}

export const sessionCookie = (token = TOKEN, extra = "") => `ioh_session=${token}; Path=/; HttpOnly; SameSite=Lax${extra}`;

// ---- creator application wizard fixtures ----------------------------------------------------------------------------------------------
import optionsJson from "./fixtures/application-options.json";
import type { ApplicationOptions, ApplicationState } from "@/lib/api/schemas";

/** Captured from the running API's GET /creator/applications/options (not hand-written), so tests use the real slugs, ids and limits. */
export const OPTIONS = optionsJson as unknown as ApplicationOptions;

export const APPLICATION_ID = "22222222-2222-4222-8222-222222222222";

export function applicationState(overrides: Partial<ApplicationState> & Record<string, unknown> = {}): ApplicationState {
  const base: ApplicationState = {
    application: { id: APPLICATION_ID, status: "draft", editable: true, createdAt: "2026-10-19T10:00:00.000Z", submittedAt: null, reviewedAt: null, feedback: null },
    profile: { displayName: null, primaryNiche: null, otherNiches: [], city: null, bio: null, photoFileId: null, language: null, contentStyle: null, engagementRatePct: null },
    audience: { platforms: [], collaborations: [], brandFit: [] },
    rates: { prices: [], minimumBooking: null, deliverables: null, revisionsRounds: null, usageRightsMonths: null, depositTerms: null, payoutAccounts: [] },
    progress: {
      profile: { complete: false, missing: ["displayName", "primaryNiche", "city", "bio"] },
      audience: { complete: false, missing: ["platforms", "brandFit"] },
      rates: { complete: false, missing: ["prices"] },
    },
    canSubmit: false,
    nextStep: "profile",
    canReapply: false,
  };
  return { ...base, ...overrides } as ApplicationState;
}

export const BIO = "A creator bio that is certainly long enough to pass the forty character rule.";

/** A fully filled draft, as the API returns it after the three steps were saved. */
export function completeDraft(overrides: Record<string, unknown> = {}): ApplicationState {
  return applicationState({
    profile: { displayName: "Amina Beauty", primaryNiche: "beauty", otherNiches: ["fashion"], city: "douala", bio: BIO, photoFileId: null, language: "bilingual", contentStyle: "Short reels", engagementRatePct: 4.5 },
    audience: { platforms: [{ platform: "instagram", handle: "@amina", followers: 25000 }], collaborations: [{ brandName: "MTN", description: null, year: 2024 }], brandFit: [1, 2] },
    rates: { prices: [{ platform: "instagram", priceXaf: 85000 }], minimumBooking: "1-week", deliverables: "1 reel", revisionsRounds: 2, usageRightsMonths: 6, depositTerms: "full_in_escrow", payoutAccounts: [{ method: "mtn_momo", last3: "113" }] },
    progress: { profile: { complete: true, missing: [] }, audience: { complete: true, missing: [] }, rates: { complete: true, missing: [] } },
    canSubmit: true,
    nextStep: "submit",
    ...overrides,
  });
}

/** A fake upstream API that answers by "METHOD /path" (the part after the base URL) and records every call. Unexpected calls fail loudly. */
export function routeFetch(routes: Record<string, Response | Error | ((call: RecordedCall) => Response | Promise<Response>)>) {
  const calls: RecordedCall[] = [];
  const impl = (async (input: URL | RequestInfo, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const key = `${init.method ?? "GET"} ${url.pathname.replace(/^\/api\/v1/, "")}`;
    const call: RecordedCall = { url: String(input), init, headers: { ...(init.headers as Record<string, string>) } };
    calls.push(call);
    const answer = routes[key];
    if (answer === undefined) throw new Error(`routeFetch: unexpected call ${key}`);
    if (answer instanceof Error) throw answer;
    if (typeof answer === "function") return answer(call);
    return new Response(await answer.clone().text(), { status: answer.status, headers: answer.headers });
  }) as typeof fetch;
  const keys = () => calls.map((c) => `${c.init.method ?? "GET"} ${new URL(c.url).pathname.replace(/^\/api\/v1/, "")}`);
  return { fetch: impl, calls, keys };
}

// ---- brand campaigns fixtures ---------------------------------------------------------------------------------------------------------
import campaignOptionsJson from "./fixtures/campaign-options.json";
import type { CampaignListItem, CampaignOptions, CampaignView } from "@/lib/api/schemas";

/** Captured from the running API's GET /brand/campaigns/options (not hand-written). */
export const CAMPAIGN_OPTIONS = campaignOptionsJson as unknown as CampaignOptions;
export const CAMPAIGN_ID = "33333333-3333-4333-8333-333333333333";

export function campaignView(overrides: Partial<CampaignView> = {}): CampaignView {
  return {
    id: CAMPAIGN_ID,
    reference: "CMP-7",
    title: "Summer Glow Launch",
    niche: { slug: "beauty", name: "Beauty" },
    budgetXaf: 500000,
    startDate: "2031-03-01",
    endDate: "2031-03-31",
    status: "draft",
    submittedAt: null,
    reviewedAt: null,
    createdAt: "2026-10-19T10:00:00.000Z",
    updatedAt: "2026-10-19T10:00:00.000Z",
    deliverables: "1 story + 2 TikToks + 1 YouTube mention",
    minEngagement: { pct: 5, label: "5%+" },
    cities: [{ slug: "douala", name: "Douala" }],
    interests: [{ slug: "beauty-skincare", name: "Beauty & skincare" }],
    ageRanges: [{ code: "45-plus", label: "45+" }],
    imageFileIds: [],
    reviewNote: null,
    cancelledAt: null,
    ...overrides,
  };
}

export function campaignListItem(overrides: Partial<CampaignListItem> = {}): CampaignListItem {
  const { deliverables, minEngagement, cities, interests, ageRanges, imageFileIds, reviewNote, cancelledAt, ...item } = campaignView(overrides);
  void [deliverables, minEngagement, cities, interests, ageRanges, imageFileIds, reviewNote, cancelledAt];
  return item;
}
