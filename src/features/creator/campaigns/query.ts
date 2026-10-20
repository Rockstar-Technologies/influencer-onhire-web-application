export const SORTS = ["newest", "start_date", "end_date", "budget"] as const;
export type CampaignSort = (typeof SORTS)[number];
export const SORT_LABELS: Record<CampaignSort, string> = { newest: "Newest", start_date: "Starts soonest", end_date: "Ends soonest", budget: "Highest budget" };

/** Budget brackets the interface offers: they map onto the API's inclusive budgetMin / budgetMax. */
export const BUDGETS: Record<string, { min?: number; max?: number; label: string }> = {
  "0-100000": { max: 99_999, label: "Under 100,000 CFA" },
  "100000-500000": { min: 100_000, max: 499_999, label: "100,000 – 500,000 CFA" },
  "500000+": { min: 500_000, label: "500,000+ CFA" },
};

export interface CampaignQuery {
  q: string;
  sort: CampaignSort;
  niche: string[];
  city: string[];
  budget: string;
  eligibleOnly: boolean;
  cursor?: string;
}

export type RawParams = Record<string, string | string[] | undefined>;
const SLUG = /^[a-z0-9][a-z0-9-]{0,59}$/;
const CURSOR = /^[A-Za-z0-9_=-]{1,512}$/;
const many = (value: string | string[] | undefined) => (Array.isArray(value) ? value : [value]).filter((v): v is string => typeof v === "string" && v.length > 0);
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** URL -> query. Every value is checked against what the API accepts; anything else is dropped, never forwarded. */
export function parseCampaignQuery(params: RawParams): CampaignQuery {
  const q = (first(params.q) ?? "").trim();
  const cursor = first(params.cursor);
  const budget = many(params.budget).find((v) => Object.hasOwn(BUDGETS, v)) ?? "";
  return {
    q: q.length >= 2 && q.length <= 100 ? q : "",
    sort: SORTS.find((s) => s === first(params.sort)) ?? "newest",
    niche: many(params.niche).filter((v) => SLUG.test(v)).slice(0, 6),
    city: many(params.city).filter((v) => SLUG.test(v)).slice(0, 7),
    budget,
    eligibleOnly: first(params.eligible) === "true",
    ...(cursor && CURSOR.test(cursor) ? { cursor } : {}),
  };
}

export function toApiQuery(query: CampaignQuery, limit: number): Record<string, string | number> {
  const out: Record<string, string | number> = { limit, sort: query.sort };
  if (query.q) out.q = query.q;
  if (query.niche.length) out.niche = query.niche.join(",");
  if (query.city.length) out.city = query.city.join(",");
  const range = query.budget ? BUDGETS[query.budget] : undefined;
  if (range?.min !== undefined) out.budgetMin = range.min;
  if (range?.max !== undefined) out.budgetMax = range.max;
  if (query.eligibleOnly) out.eligibleOnly = "true";
  if (query.cursor) out.cursor = query.cursor;
  return out;
}

export function campaignsHref(query: CampaignQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.sort !== "newest") params.set("sort", query.sort);
  for (const v of query.niche) params.append("niche", v);
  for (const v of query.city) params.append("city", v);
  if (query.budget) params.set("budget", query.budget);
  if (query.eligibleOnly) params.set("eligible", "true");
  if (query.cursor) params.set("cursor", query.cursor);
  const text = params.toString();
  return text ? `/creator/campaigns?${text}` : "/creator/campaigns";
}

// ---- applying -------------------------------------------------------------------------------------------------------------------

export const PITCH_MIN = 10;
export const PITCH_MAX = 500;

export interface ApplyValues {
  platform: string;
  price: string;
  pitch: string;
}
export type ApplyErrors = Partial<Record<"platform" | "price" | "pitch" | "form", string>>;

/** The whole-XAF amount typed ("85,000", "85 000", "85000 FCFA"), or null if it is not a positive whole number. */
export function parsePrice(text: string): number | null {
  const digits = text.replace(/[\s,]|fcfa|cfa|xaf/gi, "");
  return /^\d{1,12}$/.test(digits) && Number(digits) > 0 ? Number(digits) : null;
}

/** Friendly checks before anything is sent. The API stays the authority (platform ownership, its minimum price, the engagement rule, the campaign's state). */
export function validateApplication(values: ApplyValues, context: { platforms: readonly string[]; budgetXaf: number }): ApplyErrors {
  const errors: ApplyErrors = {};
  if (!context.platforms.includes(values.platform)) errors.platform = "Choose one of your platforms.";
  const price = parsePrice(values.price);
  if (price === null) errors.price = "Enter your price as a whole number of CFA.";
  else if (price > context.budgetXaf) errors.price = `The brand's maximum is ${context.budgetXaf.toLocaleString("en-US")} CFA per creator.`;
  const pitch = values.pitch.trim();
  if (pitch.length < PITCH_MIN) errors.pitch = `Write at least ${PITCH_MIN} characters.`;
  else if (pitch.length > PITCH_MAX) errors.pitch = `Keep it under ${PITCH_MAX} characters.`;
  return errors;
}

/** The request body. There is no creator, brand, status or date: the creator is the session, the window is the campaign's own dates. */
export function applicationToApi(values: ApplyValues) {
  return { platform: values.platform, priceXaf: parsePrice(values.price) as number, pitch: values.pitch.trim() };
}

const FIELD: Record<string, "platform" | "price" | "pitch"> = { platform: "platform", priceXaf: "price", pitch: "pitch" };
export function applyErrorsFromDetails(details: readonly { path: string; message: string }[]): ApplyErrors {
  const errors: ApplyErrors = {};
  for (const d of details) {
    const key = FIELD[d.path.replace(/^body\./, "").split(/[.[]/)[0] ?? ""] ?? "form";
    if (!errors[key]) errors[key] = d.message;
  }
  return errors;
}
