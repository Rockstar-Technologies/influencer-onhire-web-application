import type { Influencer } from "@/types/influencer";
import type { InfluencerSearchOptions } from "@/types/influencer-filters";
import { MOCK_SEARCH_OPTIONS } from "./mock/influencer-filters.mock";
import { MOCK_INFLUENCERS } from "./mock/influencers.mock";

export async function getInfluencerSearchOptions(): Promise<InfluencerSearchOptions> {
  // TODO: replace with `fetch("/api/influencers/search-options")` once the backend exists
  return MOCK_SEARCH_OPTIONS;
}

export async function getFeaturedInfluencers(): Promise<Influencer[]> {
  // TODO: replace with `fetch("/api/influencers/featured")` once the backend exists
  return MOCK_INFLUENCERS;
}
