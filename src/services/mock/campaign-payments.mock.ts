import type { EscrowStep } from "@/types/payment";

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
