export type EscrowStatus = "held" | "requested" | "released";

export type PaymentMethod = "MTN MoMo" | "Orange Money";

export interface EscrowPayment {
  id: string;
  invoice: string;
  campaign: string;
  brand: { id: string; name: string };
  creator: { id: string; name: string };
  // Full amount the brand deposited. The platform fee and creator payout are derived from it.
  gross: number;
  method: PaymentMethod;
  status: EscrowStatus;
  fundedAt: string;
  requestedAt?: string;
  releasedAt?: string;
}

export interface PaymentSplit {
  gross: number;
  fee: number;
  net: number;
}

export interface PaymentQuery {
  q: string;
  status: EscrowStatus | "all";
}

export interface PaymentSummary {
  grossDeposits: number;
  netPayouts: number;
  // Fees on released payments only; fees on money still in escrow are `pendingRevenue`.
  platformRevenue: number;
  pendingRevenue: number;
  heldInEscrow: number;
  heldCount: number;
  payoutRequests: number;
  releasedCount: number;
  invoiceCount: number;
}

export interface MonthlyPaymentStat {
  month: string;
  escrowVolume: number;
  commission: number;
  avgReleaseDays: number;
}
