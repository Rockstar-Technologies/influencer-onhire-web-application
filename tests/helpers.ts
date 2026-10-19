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

// ---- offers fixtures (shapes captured from the running API's /brand/offers and /creator/offers) --------------------------------------------
import type { HireCreator, OfferView } from "@/lib/api/schemas";

export const OFFER_ID = "44444444-4444-4444-8444-444444444444";

/** A pending direct hire as a creator sees it. */
export function offerView(overrides: Partial<OfferView> = {}): OfferView {
  return {
    id: OFFER_ID,
    reference: "HR-12",
    origin: "direct_hire",
    status: "pending",
    initiator: "brand",
    priceXaf: 30000,
    platform: { code: "tiktok", name: "TikTok" },
    pitch: null,
    window: null,
    fundingDeadline: null,
    respondedAt: null,
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    campaign: null,
    hire: { contactName: "Marketing Team", location: "Douala", socialHandle: "@acmefoods", promotion: "A new snack line", durationDays: 7, durationLabel: "1 week", paymentMethod: { code: "mtn_momo", name: "MTN MoMo" } },
    brandName: "Acme Foods",
    ...overrides,
  };
}

/** A platform invitation to a campaign as a creator sees it. */
export function invitationView(overrides: Partial<OfferView> = {}): OfferView {
  return offerView({
    id: "55555555-5555-4555-8555-555555555555",
    reference: "HR-13",
    origin: "campaign_match",
    initiator: "platform",
    hire: null,
    campaign: { id: CAMPAIGN_ID, reference: "CMP-7", title: "Summer Glow Launch", status: "open", maxBudgetXaf: 500000, startDate: "2031-03-01", endDate: "2031-03-31", brandName: "Acme Foods" },
    ...overrides,
  });
}

/** The brand's view of an offer: the creator's public facts instead of `brandName`. */
export function brandOfferView(overrides: Partial<OfferView> = {}): OfferView {
  const { brandName, ...rest } = offerView();
  void brandName;
  return { ...rest, creator: { username: "kevin.fitness", displayName: "Kevin Fitness", photoFileId: null, city: "Yaoundé", platformHandle: "@kevin_fitness", platformFollowers: 120000, listedRateXaf: 30000 }, ...overrides };
}

export function hireCreator(overrides: Partial<HireCreator> = {}): HireCreator {
  return {
    username: "kevin.fitness",
    displayName: "Kevin Fitness",
    photoFileId: null,
    city: { slug: "yaounde", name: "Yaoundé" },
    primaryNiche: "fitness",
    minimumBooking: { code: "1-week", label: "1 week", days: 7 },
    platforms: [
      { platform: "tiktok", name: "TikTok", handle: "@kevin_fitness", followers: 120000, priceXaf: 30000 },
      { platform: "instagram", name: "Instagram", handle: "@kevin.fit", followers: 40000, priceXaf: 45000 },
    ],
    acceptedPaymentMethods: [
      { code: "mtn_momo", name: "MTN MoMo" },
      { code: "orange_money", name: "Orange Money" },
    ],
    ...overrides,
  };
}

// ---- notification fixtures (shape captured from the running API's GET /notifications) ------------------------------------------------------
import type { NotificationView } from "@/lib/api/schemas";

export const NOTIFICATION_ID = "66666666-6666-4666-8666-666666666666";

export function notificationView(overrides: Partial<NotificationView> = {}): NotificationView {
  return {
    id: NOTIFICATION_ID,
    type: "offer_received",
    title: "New hire request",
    body: "You have a new hire request. Reference HR-12.",
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    readAt: null,
    links: { campaignId: null, offerId: OFFER_ID, paymentId: null, withdrawalId: null },
    ...overrides,
  };
}

// ---- funding fixtures (shapes captured from the running API's /brand/offers/:id/funding and /brand/payments) -----------------------------------
import type { BrandPayment, FundingView } from "@/lib/api/schemas";

export function fundingView(overrides: Partial<FundingView> = {}): FundingView {
  return {
    offerId: OFFER_ID,
    amountXaf: 250_000,
    deadline: "2031-01-08T10:00:00.000Z",
    status: "not_started",
    canStart: true,
    simulated: false,
    payment: null,
    attempts: [],
    ...overrides,
  };
}

export function fundedView(overrides: Partial<FundingView> = {}): FundingView {
  return fundingView({
    status: "funded",
    canStart: false,
    simulated: true,
    payment: { id: "88888888-8888-4888-8888-888888888888", reference: "INV-5", status: "held" },
    attempts: [{ id: "99999999-9999-4999-8999-999999999999", status: "succeeded", confirmation: "succeeded", failure: null, startedAt: "2031-01-01T10:00:00.000Z", completedAt: "2031-01-01T10:00:02.000Z", simulated: true }],
    ...overrides,
  });
}

export function brandPayment(overrides: Partial<BrandPayment> = {}): BrandPayment {
  return {
    id: "88888888-8888-4888-8888-888888888888",
    reference: "INV-5",
    status: "held",
    amountXaf: 250_000,
    fundedAt: "2031-01-01T10:00:02.000Z",
    simulated: true,
    requestedAt: null,
    releasedAt: null,
    engagement: { offerId: OFFER_ID, origin: "direct_hire", campaign: null },
    creator: { username: "kevin.fitness", displayName: "Kevin Fitness" },
    ...overrides,
  };
}

// ---- admin fixtures (shapes captured from the running API's /admin/* routes) ----------------------------------------------------------------
import type { AdminApplicationDetail, AdminApplicationListItem, AdminCampaignDetail, AdminCampaignListItem, AdminPaymentDetail, AdminUserDetail, AdminUserListItem } from "@/lib/api/schemas";

export const TARGET_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

export function adminUserItem(overrides: Partial<AdminUserListItem> = {}): AdminUserListItem {
  return { id: TARGET_ID, email: "kevin@example.test", fullName: "Kevin Brand", phone: "670000009", role: "brand", status: "active", isFlagged: false, lastActiveAt: "2026-10-19T10:00:00.000Z", createdAt: "2026-10-01T10:00:00.000Z", ...overrides };
}
export function adminUserDetail(overrides: Partial<AdminUserDetail> = {}): AdminUserDetail {
  return { ...adminUserItem(), updatedAt: "2026-10-19T10:00:00.000Z", brandProfile: { industry: null, city: null }, ...overrides } as AdminUserDetail;
}
export function adminApplicationItem(overrides: Partial<AdminApplicationListItem> = {}): AdminApplicationListItem {
  return { id: TARGET_ID, status: "under_review", displayName: "Amina Beauty", createdAt: "2026-10-01T10:00:00.000Z", submittedAt: "2026-10-02T10:00:00.000Z", reviewedAt: null, applicant: { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", email: "amina@example.test", fullName: "Amina K" }, ...overrides };
}
export function adminApplicationDetail(overrides: Partial<AdminApplicationDetail> = {}): AdminApplicationDetail {
  return {
    id: TARGET_ID,
    status: "under_review",
    createdAt: "2026-10-01T10:00:00.000Z",
    submittedAt: "2026-10-02T10:00:00.000Z",
    reviewedAt: null,
    reviewedBy: null,
    reviewNote: null,
    applicant: { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", email: "amina@example.test", fullName: "Amina K", phone: "670000001", accountStatus: "pending" },
    profile: { displayName: "Amina Beauty", photoFileId: null, city: { slug: "douala", name: "Douala" }, bio: "I make beauty reels for audiences in Douala.", contentStyle: null, language: null, engagementRatePct: null, minimumBooking: { code: "2-weeks", label: "2 weeks", days: 14 }, deliverables: "1 reel + 3 stories", revisionsRounds: 2, usageRightsMonths: 6, depositTerms: "full_in_escrow" },
    niches: [{ slug: "beauty", name: "Beauty", isPrimary: true }],
    platforms: [{ code: "instagram", name: "Instagram", handle: "@amina.beauty", followers: 25000, priceXaf: 85000 }],
    collaborations: [{ position: 1, brandName: "MTN Cameroon", description: "Brand ambassador", year: 2024 }],
    brandFit: ["Beauty & Skincare"],
    payoutMethods: [{ method: "mtn_momo", methodName: "MTN MoMo", last3: "456" }],
    ...overrides,
  };
}
export function adminCampaignItem(overrides: Partial<AdminCampaignListItem> = {}): AdminCampaignListItem {
  return { id: TARGET_ID, reference: "CMP-9", title: "Summer Glow Launch", niche: { slug: "beauty", name: "Beauty" }, budgetXaf: 500000, startDate: "2031-03-01", endDate: "2031-03-31", status: "pending_review", submittedAt: "2026-10-02T10:00:00.000Z", reviewedAt: null, createdAt: "2026-10-01T10:00:00.000Z", updatedAt: "2026-10-02T10:00:00.000Z", brand: { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "Glow Cosmetics" }, ...overrides };
}
export function adminCampaignDetail(overrides: Partial<AdminCampaignDetail> = {}): AdminCampaignDetail {
  return { ...adminCampaignItem(), deliverables: "1 reel and 3 stories", minEngagement: { pct: 3, label: "3%+" }, cities: [{ slug: "douala", name: "Douala" }], interests: [], ageRanges: [], imageFileIds: [], reviewNote: null, cancelledAt: null, ...overrides };
}
export function adminPaymentDetail(overrides: Partial<AdminPaymentDetail> = {}): AdminPaymentDetail {
  return {
    id: TARGET_ID,
    reference: "INV-8",
    status: "requested",
    amountXaf: 85000,
    fundedAt: "2026-10-19T10:00:00.000Z",
    simulated: true,
    requestedAt: "2026-10-19T12:00:00.000Z",
    releasedAt: null,
    delivery: { reportedAt: "2026-10-19T12:00:00.000Z", acknowledgedAt: "2026-10-19T13:00:00.000Z", disputeDeadline: null, disputeWindowOpen: false, releaseEligible: true },
    dispute: null,
    actions: { canRelease: true },
    engagement: { offerId: OFFER_ID, origin: "direct_hire", campaign: null },
    feeXaf: 17000,
    netXaf: 68000,
    feeRatePct: 20,
    brand: { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "Fresh Brand" },
    creator: { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", username: "amina.beauty", displayName: "Amina Beauty" },
    deliveryReport: null,
    collection: { provider: "fake", simulated: true, status: "succeeded", completedAt: "2026-10-19T10:00:01.000Z", payer: { method: "mtn_momo", last3: "456" } },
    ...overrides,
  };
}

/** `GET /auth/me` for an administrator holding exactly these permission codes. */
export function adminMe(permissions: string[], user: Record<string, unknown> = {}) {
  return jsonResponse(200, { data: { user: apiUser({ role: "admin", phone: null, id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", ...user }), session: { expiresAt: "2026-12-31T00:00:00.000Z" }, permissions } });
}
