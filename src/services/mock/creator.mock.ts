import type { CreatorAccount } from "@/types/account";
import type { CampaignRequest, CreatorWorkload } from "@/types/campaign-request";

export const MOCK_CURRENT_CREATOR: CreatorAccount = {
  id: "inf-amara",
  name: "Amara Kilonzo",
  initials: "AK",
  accountLabel: "Creator Account",
  niche: "Beauty",
  city: "Douala",
};

export const MOCK_CREATOR_WORKLOAD: CreatorWorkload = {
  activeCampaigns: 2,
  maxActiveCampaigns: 2,
};

export const MOCK_DECLINE_REASONS: string[] = [
  "Schedule conflict",
  "Budget doesn't match my rates",
  "Not a fit for my audience",
  "Other",
];

export const MOCK_CAMPAIGN_REQUESTS: CampaignRequest[] = [
  {
    id: "req-nova",
    campaignTitle: "Radiant Skin Challenge",
    brandName: "Nova Skincare",
    niche: "Beauty",
    city: "Douala",
    budget: 320000,
    durationDays: 10,
    deliverablesSummary: "1 Post + 2 Stories",
    matchReasons: ["Beauty niche", "Douala audience", "6.4% engagement (above 3% threshold)"],
    receivedAt: new Date().toISOString().slice(0, 10),
    status: "pending",
  },
  {
    id: "req-summer",
    campaignTitle: "Summer Glow Launch",
    brandName: "Lumière Cosmetics",
    niche: "Beauty",
    city: "Douala",
    budget: 1440000,
    durationDays: 14,
    deliverablesSummary: "1 Story + 2 TikToks + 1 YouTube mention",
    matchReasons: [],
    receivedAt: "2026-09-07",
    status: "accepted",
    respondedAt: "2026-09-08",
  },
  {
    id: "req-skin",
    campaignTitle: "Skin Glow Refresh",
    brandName: "Lumière Cosmetics",
    niche: "Beauty",
    city: "Douala",
    budget: 1260000,
    durationDays: 12,
    deliverablesSummary: "3 Reels + 1 TikTok",
    matchReasons: [],
    receivedAt: "2026-07-29",
    status: "accepted",
    respondedAt: "2026-07-30",
  },
  {
    id: "req-festive",
    campaignTitle: "Festive Hair Campaign",
    brandName: "Studyo",
    niche: "Beauty",
    city: "Yaoundé",
    budget: 660000,
    durationDays: 7,
    deliverablesSummary: "2 Posts",
    matchReasons: [],
    receivedAt: "2026-06-01",
    status: "declined",
    respondedAt: "2026-06-02",
    declineReason: "Schedule conflict",
  },
];
