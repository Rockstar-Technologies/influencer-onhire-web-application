import type { CampaignOverview, CampaignPreview } from "@/types/campaign";
import { MOCK_CAMPAIGN_OVERVIEW, MOCK_CAMPAIGN_PREVIEW } from "./mock/campaigns.mock";

// Static marketing copy and a decorative illustration for the public Campaigns section. It states no figure about the platform: every operation on real
// campaigns goes through src/features/brand-campaigns and the API.
export async function getCampaignOverview(): Promise<CampaignOverview> {
  return MOCK_CAMPAIGN_OVERVIEW;
}

export async function getCampaignPreview(): Promise<CampaignPreview> {
  return MOCK_CAMPAIGN_PREVIEW;
}
