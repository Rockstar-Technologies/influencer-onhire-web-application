export type EscrowStatus = "on_hold" | "payout_requested" | "released";

export type PaymentMethod = "mtn_momo" | "orange_money";

export interface PaymentInfluencer {
  id: string;
  name: string;
  initials: string;
}

export interface CampaignPayment {
  id: string;
  reference: string;
  campaignTitle: string;
  influencer: PaymentInfluencer;
  amount: number;
  method: PaymentMethod;
  payerPhone: string;
  fundedAt: string;
  status: EscrowStatus;
  deliverables: string[];
  payoutRequestedAt?: string;
  releasedAt?: string;
}

export interface EscrowSummary {
  totalFunded: number;
  inEscrow: number;
  released: number;
  activeCampaigns: number;
}

export interface EscrowStep {
  id: string;
  title: string;
  description: string;
}

export interface FundCampaignInput {
  campaignTitle: string;
  influencerId: string;
  amount: number;
  method: PaymentMethod;
  payerPhone: string;
}
