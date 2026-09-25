import type { InfluencerQuery } from "@/types/influencer-filters";

export type RawSearchParams = Record<string, string | string[] | undefined>;

// URL <-> InfluencerQuery. Every param other than `q` and `sort` is treated as a
// filter group key, matching the hidden inputs HeroSearch submits.
export function parseInfluencerQuery(params: RawSearchParams): InfluencerQuery {
  const { q, sort, ...rest } = params;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

  const filters: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(rest)) {
    const values = (Array.isArray(value) ? value : [value]).filter((item): item is string => Boolean(item));
    if (values.length > 0) filters[key] = values;
  }

  return { q: first(q) ?? "", sort: first(sort) ?? "", filters };
}

export function buildInfluencersHref(query: InfluencerQuery) {
  const params = new URLSearchParams();
  if (query.q.trim()) params.set("q", query.q.trim());
  if (query.sort) params.set("sort", query.sort);
  for (const [key, values] of Object.entries(query.filters)) {
    for (const value of values) params.append(key, value);
  }
  const search = params.toString();
  return search ? `/influencers?${search}` : "/influencers";
}
