import type { Influencer } from "@/types/influencer";
import { MOCK_INFLUENCERS } from "./mock/influencers.mock";

export async function getFeaturedInfluencers(): Promise<Influencer[]> {
  // TODO: replace with `fetch("/api/influencers/featured")` once the backend exists
  return MOCK_INFLUENCERS;
}
