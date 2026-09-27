import type { Campaign, CampaignFormOptions, CampaignGuidance, CampaignInput, ReachCriteria } from "@/types/campaign";
import { MOCK_CAMPAIGN_FORM_OPTIONS, MOCK_CAMPAIGN_GUIDANCE, MOCK_CAMPAIGNS } from "./mock/campaigns.mock";
import { MOCK_INFLUENCERS } from "./mock/influencers.mock";

export async function getCampaignFormOptions(): Promise<CampaignFormOptions> {
  // TODO: replace with `fetch("/api/campaigns/form-options")` once the backend exists
  return MOCK_CAMPAIGN_FORM_OPTIONS;
}

export async function getCampaignGuidance(): Promise<CampaignGuidance> {
  // TODO: replace with `fetch("/api/campaigns/guidance")` once the backend exists
  return MOCK_CAMPAIGN_GUIDANCE;
}

// How many verified influencers a campaign with these criteria would reach.
export async function estimateCampaignReach(criteria: ReachCriteria): Promise<number> {
  // TODO: replace with `fetch("/api/campaigns/reach?...")`; the backend does this matching.
  const minEngagement = Number(criteria.minEngagement) || 0;
  return MOCK_INFLUENCERS.filter((influencer) => {
    if (criteria.niche && !influencer.categories.includes(criteria.niche)) return false;
    if (criteria.locations.length > 0 && !criteria.locations.includes(normalize(influencer.location))) return false;
    return influencer.engagementRate >= minEngagement;
  }).length;
}

export async function createCampaign(input: CampaignInput): Promise<Campaign> {
  // TODO: replace with `fetch("/api/campaigns", { method: "POST", body: JSON.stringify(input) })`
  const id = crypto.randomUUID();
  const campaign: Campaign = {
    ...input,
    id,
    reference: `CMP-${id.slice(0, 6).toUpperCase()}`,
    status: "pending_review",
    matchedCount: await estimateCampaignReach(input),
    createdAt: new Date().toISOString(),
  };
  MOCK_CAMPAIGNS.push(campaign);
  return campaign;
}

// "Yaoundé" -> "yaounde", matching the filter option values.
function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
