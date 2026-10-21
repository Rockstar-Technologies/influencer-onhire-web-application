import type { FilterGroup, InfluencerSearchOptions } from "@/types/influencer-filters";
import type { PublicFilters } from "@/lib/api/schemas";
import { LANGUAGE, PLATFORM } from "@/lib/domain/vocabulary";
import { LANGUAGE_LABELS } from "@/lib/domain/labels";

/** The browse page's state, parsed from the URL. `filters` is keyed by filter-group key; `cursor` is the API's opaque paging value. */
export interface DirectoryQuery {
  q: string;
  sort: string;
  filters: Record<string, string[]>;
  cursor?: string;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

export const SORT_KEYS = ["recommended", "top_rated", "newest", "engagement", "price_asc", "price_desc", "followers"] as const;
const SORT_LABELS: Record<(typeof SORT_KEYS)[number], string> = {
  recommended: "Recommended",
  top_rated: "Top rated",
  newest: "Newest",
  engagement: "Highest engagement",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  followers: "Most followers",
};

/** Ranges the interface offers. Each maps onto the API's inclusive min/max parameters (the upper bound is exclusive here, so brackets never overlap). */
export const FOLLOWER_RANGES: Record<string, { min?: number; max?: number; label: string }> = {
  "0-50k": { max: 49_999, label: "Under 50K" },
  "50k-200k": { min: 50_000, max: 199_999, label: "50K – 200K" },
  "200k-1m": { min: 200_000, max: 999_999, label: "200K – 1M" },
  "1m+": { min: 1_000_000, label: "1M+" },
};
export const BUDGET_RANGES: Record<string, { min?: number; max?: number; label: string }> = {
  "0-25000": { max: 24_999, label: "Under 25,000 CFA" },
  "25000-100000": { min: 25_000, max: 99_999, label: "25,000 – 100,000 CFA" },
  "100000-500000": { min: 100_000, max: 499_999, label: "100,000 – 500,000 CFA" },
  "500000+": { min: 500_000, label: "500,000+ CFA" },
};
export const SUCCESS_RATES: Record<string, string> = { "90": "90%+", "75": "75%+" };

const SLUG = /^[a-z0-9][a-z0-9-]{0,59}$/;
const CURSOR = /^[A-Za-z0-9_=-]{1,512}$/;

function many(value: string | string[] | undefined): string[] {
  return (Array.isArray(value) ? value : [value]).filter((item): item is string => typeof item === "string" && item.length > 0);
}
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * URL -> query. EVERY value is checked here against what the API accepts, and anything else is dropped (never forwarded): free text only for `q`
 * (2 to 100 characters), slugs for niche and location, the four platform codes, the three language codes, one of the fixed ranges, one of the sort keys.
 */
export function parseDirectoryQuery(params: RawSearchParams): DirectoryQuery {
  const q = (first(params.q) ?? "").trim();
  const sort = SORT_KEYS.find((key) => key === first(params.sort)) ?? "";
  const filters: Record<string, string[]> = {};
  const niche = many(params.niche).filter((v) => SLUG.test(v)).slice(0, 6);
  const location = many(params.location).filter((v) => SLUG.test(v)).slice(0, 7);
  const platform = many(params.platform).filter((v) => PLATFORM.is(v)).slice(0, 4);
  const language = many(params.language).filter((v) => LANGUAGE.is(v)).slice(0, 3);
  const followers = many(params.followers).find((v) => Object.hasOwn(FOLLOWER_RANGES, v));
  const budget = many(params.budget).find((v) => Object.hasOwn(BUDGET_RANGES, v));
  const successRate = many(params["success-rate"]).find((v) => Object.hasOwn(SUCCESS_RATES, v));
  if (niche.length) filters.niche = niche;
  if (location.length) filters.location = location;
  if (platform.length) filters.platform = platform;
  if (language.length) filters.language = language;
  if (followers) filters.followers = [followers];
  if (budget) filters.budget = [budget];
  if (successRate) filters["success-rate"] = [successRate];
  const cursor = first(params.cursor);
  return { q: q.length >= 2 && q.length <= 100 ? q : "", sort, filters, ...(cursor && CURSOR.test(cursor) ? { cursor } : {}) };
}

/** The API parameters for a query. Returns only keys the endpoint allows. */
export function toApiQuery(query: DirectoryQuery, limit: number): Record<string, string | number> {
  const out: Record<string, string | number> = { limit };
  const q = query.q.replace(/^@/, "");
  if (q.length >= 2) out.q = q;
  if (query.sort) out.sort = query.sort;
  const f = query.filters;
  if (f.niche?.length) out.niche = f.niche.join(",");
  if (f.location?.length) out.city = f.location.join(",");
  if (f.platform?.length) out.platform = f.platform.join(",");
  if (f.language?.length) out.language = f.language.join(",");
  const followers = f.followers?.[0] ? FOLLOWER_RANGES[f.followers[0]] : undefined;
  if (followers?.min !== undefined) out.followersMin = followers.min;
  if (followers?.max !== undefined) out.followersMax = followers.max;
  const budget = f.budget?.[0] ? BUDGET_RANGES[f.budget[0]] : undefined;
  if (budget?.min !== undefined) out.priceMin = budget.min;
  if (budget?.max !== undefined) out.priceMax = budget.max;
  if (f["success-rate"]?.[0]) out.minSuccessRate = Number(f["success-rate"][0]);
  if (query.cursor) out.cursor = query.cursor;
  return out;
}

export function buildDirectoryHref(query: DirectoryQuery) {
  const params = new URLSearchParams();
  if (query.q.trim()) params.set("q", query.q.trim());
  if (query.sort) params.set("sort", query.sort);
  for (const [key, values] of Object.entries(query.filters)) for (const value of values) params.append(key, value);
  if (query.cursor) params.set("cursor", query.cursor);
  const search = params.toString();
  return search ? `/influencers?${search}` : "/influencers";
}

/** The filter panel: the lists come from the API (only values some visible creator has); the ranges are fixed by the interface. */
export function buildSearchOptions(filters: PublicFilters): InfluencerSearchOptions {
  const known = new Set<string>(SORT_KEYS);
  const sortOptions = filters.sorts.filter((s) => known.has(s.value)).map((s) => ({ value: s.value, label: SORT_LABELS[s.value as keyof typeof SORT_LABELS] ?? s.label }));
  const groups: FilterGroup[] = [
    { key: "niche", label: "Niche", mode: "multiple", options: filters.niches.map((n) => ({ value: n.slug, label: n.name })) },
    { key: "location", label: "Location", mode: "multiple", options: filters.cities.map((c) => ({ value: c.slug, label: c.name })) },
    { key: "platform", label: "Platform", mode: "multiple", options: filters.platforms.filter((p) => PLATFORM.is(p.code)).map((p) => ({ value: p.code, label: p.name })) },
    { key: "followers", label: "Followers", mode: "single", options: Object.entries(FOLLOWER_RANGES).map(([value, r]) => ({ value, label: r.label })) },
    { key: "budget", label: "Budget (starting price)", mode: "single", options: Object.entries(BUDGET_RANGES).map(([value, r]) => ({ value, label: r.label })) },
    { key: "language", label: "Language", mode: "multiple", options: filters.languages.filter((l) => LANGUAGE.is(l)).map((l) => ({ value: l, label: LANGUAGE_LABELS[l as keyof typeof LANGUAGE_LABELS] })) },
    { key: "success-rate", label: "Success rate", mode: "single", options: Object.entries(SUCCESS_RATES).map(([value, label]) => ({ value, label })) },
  ];
  return { sortOptions: sortOptions.length ? sortOptions : [{ value: "recommended", label: "Recommended" }], filterGroups: groups.filter((g) => g.options.length > 0) };
}
