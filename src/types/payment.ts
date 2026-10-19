import type { PaymentMethodCode, PaymentStatus } from "@/lib/domain/vocabulary";

/** The API's payment statuses (held, requested, released, refund_pending, refunded). */
export type EscrowStatus = PaymentStatus;

export type PaymentMethod = PaymentMethodCode;

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
