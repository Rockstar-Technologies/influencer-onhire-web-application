import type { EscrowStatus, PaymentMethod } from "./payment";

export interface CreatorCampaignEarning {
  id: string;
  reference: string;
  campaignTitle: string;
  brandName: string;
  amount: number;
  status: EscrowStatus;
  deliverables: string[];
  fundedAt: string;
  payoutRequestedAt?: string;
  releasedAt?: string;
}

export type { WithdrawalStatus } from "@/lib/domain/vocabulary";
import type { WithdrawalStatus } from "@/lib/domain/vocabulary";

export interface Withdrawal {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  phone: string;
  status: WithdrawalStatus;
}

export interface EarningsSummary {
  availableBalance: number;
  inEscrow: number;
  pendingPayout: number;
  totalEarned: number;
}

export interface WithdrawInput {
  amount: number;
  method: PaymentMethod;
  phone: string;
}
