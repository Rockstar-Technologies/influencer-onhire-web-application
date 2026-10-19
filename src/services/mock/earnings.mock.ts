import type { CreatorCampaignEarning, Withdrawal } from "@/types/earnings";
import type { EscrowStep } from "@/types/payment";

// Balance already released to the creator and not yet withdrawn, plus everything
// ever released (withdrawals don't reduce what was earned).
export const MOCK_CREATOR_BALANCE = {
  available: 1080000,
  lifetimeEarned: 5544000,
};

export const MOCK_CREATOR_CAMPAIGN_EARNINGS: CreatorCampaignEarning[] = [
  {
    id: "earn-summer",
    reference: "ESC-2026-0910",
    campaignTitle: "Summer Glow Launch",
    brandName: "Lumière Cosmetics",
    amount: 1440000,
    status: "held",
    deliverables: ["1 Instagram story", "2 TikTok posts", "1 YouTube mention"],
    fundedAt: "2026-09-10",
  },
  {
    id: "earn-skin",
    reference: "ESC-2026-0802",
    campaignTitle: "Skin Glow Refresh",
    brandName: "Lumière Cosmetics",
    amount: 1260000,
    status: "requested",
    deliverables: ["3 Instagram reels", "1 skincare routine TikTok"],
    fundedAt: "2026-08-02",
    payoutRequestedAt: "2026-09-18",
  },
  {
    id: "earn-newyear",
    reference: "ESC-2026-0105",
    campaignTitle: "New Year Glow Kit",
    brandName: "Lumière Cosmetics",
    amount: 1080000,
    status: "released",
    deliverables: ["2 Instagram posts", "1 unboxing Reel"],
    fundedAt: "2026-01-05",
    payoutRequestedAt: "2026-01-24",
    releasedAt: "2026-01-26",
  },
];

export const MOCK_WITHDRAWALS: Withdrawal[] = [
  { id: "wd-3", date: "2026-09-02", amount: 720000, method: "mtn_momo", phone: "677 123 456", status: "completed" },
  { id: "wd-2", date: "2026-08-15", amount: 540000, method: "orange_money", phone: "699 456 789", status: "completed" },
  { id: "wd-1", date: "2026-07-28", amount: 390000, method: "mtn_momo", phone: "677 123 456", status: "completed" },
];

export const MOCK_CREATOR_ESCROW_STEPS: EscrowStep[] = [
  {
    id: "brand-pays",
    title: "Brand Pays",
    description: "The brand funds your campaign via MTN MoMo or Orange Money through our secured payment methods.",
  },
  {
    id: "held",
    title: "Held in Escrow",
    description: "The payment is put on hold on the platform while you work on the campaign.",
  },
  {
    id: "request",
    title: "You Request Payout",
    description:
      "Once you've completed the campaign, submit a payout request and the platform releases your funds.",
  },
];

export const MIN_WITHDRAWAL = 1000;
