import type { Influencer, InfluencerProfile, SocialPlatform } from "@/types/influencer";
import type { InfluencerQuery, InfluencerSearchOptions } from "@/types/influencer-filters";
import { MOCK_SEARCH_OPTIONS } from "./mock/influencer-filters.mock";
import { MOCK_PROFILE_DETAILS } from "./mock/influencer-profiles.mock";
import { MOCK_INFLUENCERS } from "./mock/influencers.mock";

export async function getInfluencerSearchOptions(): Promise<InfluencerSearchOptions> {
  // TODO: replace with `fetch("/api/influencers/search-options")` once the backend exists
  return MOCK_SEARCH_OPTIONS;
}

export async function getFeaturedInfluencers(): Promise<Influencer[]> {
  // TODO: replace with `fetch("/api/influencers/featured")` once the backend exists
  return MOCK_INFLUENCERS.filter((influencer) => influencer.rating >= 4.6).slice(0, 6);
}

export async function getInfluencerProfile(username: string): Promise<InfluencerProfile | null> {
  // TODO: replace with `fetch(`/api/influencers/${username}`)` once the backend exists
  const influencer = MOCK_INFLUENCERS.find((item) => item.username === username);
  const details = influencer && MOCK_PROFILE_DETAILS[influencer.id];
  return influencer && details ? { ...influencer, ...details } : null;
}

export async function searchInfluencers(query: InfluencerQuery): Promise<Influencer[]> {
  // TODO: replace with `fetch("/api/influencers?" + params)` once the backend exists —
  // everything below is the filtering/sorting the backend will do server-side.
  const results = MOCK_INFLUENCERS.filter((influencer) => matchesText(influencer, query.q) && matchesFilters(influencer, query.filters));
  return sortInfluencers(results, query.sort);
}

// --- mock-only search logic -------------------------------------------------

const FOLLOWER_RANGES: Record<string, [number, number]> = {
  "0-50k": [0, 50_000],
  "50k-200k": [50_000, 200_000],
  "200k-1m": [200_000, 1_000_000],
  "1m+": [1_000_000, Infinity],
};

const BUDGET_RANGES: Record<string, [number, number]> = {
  "0-500000": [0, 500_000],
  "500000-1000000": [500_000, 1_000_000],
  "1000000+": [1_000_000, Infinity],
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function totalFollowers(influencer: Influencer) {
  return Object.values(influencer.social).reduce((sum, count) => sum + count, 0);
}

function inRange(value: number, range: [number, number] | undefined) {
  return !range || (value >= range[0] && value < range[1]);
}

function matchesText(influencer: Influencer, q: string) {
  const term = normalize(q.trim().replace(/^@/, ""));
  if (!term) return true;
  const haystack = [influencer.name, influencer.username, influencer.niche, influencer.location, ...influencer.categories];
  return haystack.some((field) => normalize(field).includes(term));
}

function matchesFilters(influencer: Influencer, filters: Record<string, string[]>) {
  const { niche, location, platform, followers, budget, language } = filters;
  const successRate = filters["success-rate"];

  if (niche?.length && !niche.some((value) => influencer.categories.includes(value))) return false;
  if (location?.length && !location.includes(normalize(influencer.location))) return false;
  if (platform?.length && !platform.some((value) => influencer.social[value as SocialPlatform] > 0)) return false;
  if (language?.length && !language.includes(influencer.language.toLowerCase())) return false;
  if (followers?.[0] && !inRange(totalFollowers(influencer), FOLLOWER_RANGES[followers[0]])) return false;
  if (budget?.[0] && !inRange(influencer.startingPrice, BUDGET_RANGES[budget[0]])) return false;
  if (successRate?.[0] && influencer.successRate < Number(successRate[0])) return false;
  return true;
}

function sortInfluencers(influencers: Influencer[], sort: string) {
  const sorted = [...influencers];
  switch (sort) {
    case "top-rated":
      return sorted.sort((a, b) => b.rating - a.rating);
    case "newest":
      return sorted.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
    case "engagement":
      return sorted.sort((a, b) => b.engagementRate - a.engagementRate);
    case "price-asc":
      return sorted.sort((a, b) => a.startingPrice - b.startingPrice);
    case "price-desc":
      return sorted.sort((a, b) => b.startingPrice - a.startingPrice);
    default:
      return sorted;
  }
}
