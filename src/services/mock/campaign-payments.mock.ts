import type { CampaignPayment, EscrowStep, PaymentInfluencer } from "@/types/payment";

export const MOCK_HIREABLE_INFLUENCERS: PaymentInfluencer[] = [
  { id: "inf-amara", name: "Amara Kilonzo", initials: "AK" },
  { id: "inf-lindiwe", name: "Lindiwe Osei", initials: "LO" },
  { id: "inf-brenda", name: "Brenda Mbah", initials: "BM" },
  { id: "inf-kevin", name: "Kevin Tabi", initials: "KT" },
  { id: "inf-sandra", name: "Sandra Eyong", initials: "SE" },
];

const [amara, lindiwe] = MOCK_HIREABLE_INFLUENCERS;

export const MOCK_CAMPAIGN_PAYMENTS: CampaignPayment[] = [
  {
    id: "pay-1",
    reference: "ESC-2026-0910",
    campaignTitle: "Summer Glow Launch",
    influencer: amara,
    amount: 1440000,
    method: "mtn_momo",
    payerPhone: "677 123 456",
    fundedAt: "2026-09-10",
    status: "on_hold",
    deliverables: ["1 Instagram story", "2 TikTok posts", "1 YouTube mention"],
  },
  {
    id: "pay-2",
    reference: "ESC-2026-0802",
    campaignTitle: "Skin Glow Refresh",
    influencer: amara,
    amount: 1260000,
    method: "orange_money",
    payerPhone: "699 456 789",
    fundedAt: "2026-08-02",
    status: "payout_requested",
    deliverables: ["3 Instagram reels", "1 skincare routine TikTok"],
    payoutRequestedAt: "2026-09-18",
  },
  {
    id: "pay-3",
    reference: "ESC-2026-0614",
    campaignTitle: "Holiday Radiance Campaign",
    influencer: lindiwe,
    amount: 1170000,
    method: "mtn_momo",
    payerPhone: "677 123 456",
    fundedAt: "2026-06-14",
    status: "released",
    deliverables: ["2 Instagram posts", "1 YouTube review"],
    payoutRequestedAt: "2026-07-15",
    releasedAt: "2026-07-20",
  },
];

export const MOCK_ESCROW_STEPS: EscrowStep[] = [
  {
    id: "pay",
    title: "You Pay",
    description: "Fund the campaign via MTN MoMo or Orange Money through our secured payment methods.",
  },
  {
    id: "hold",
    title: "Held in Escrow",
    description: "Your payment is put on hold on the platform until the influencer delivers the campaign.",
  },
  {
    id: "release",
    title: "Released on Completion",
    description:
      "Once the influencer requests payout and the platform confirms delivery, funds are released to them.",
  },
];
