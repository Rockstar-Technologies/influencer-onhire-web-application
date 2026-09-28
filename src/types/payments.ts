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
  // How the brand paid in.
  method: PaymentMethod;
  status: EscrowStatus;
  fundedAt: string;
  requestedAt?: string;
  releasedAt?: string;
  // Set when the creator requests cashout.
  report?: DeliveryReport;
  payoutTo?: PayoutDestination;
}

export interface DeliveryReport {
  summary: string;
  links: string[];
  submittedAt: string;
}

export interface PayoutDestination {
  method: PaymentMethod;
  phone: string;
}

// What a brand is allowed to see: what they paid and where it is. No fee, no creator payout details.
export interface BrandPaymentView {
  id: string;
  invoice: string;
  campaign: string;
  creatorName: string;
  deposited: number;
  method: PaymentMethod;
  status: EscrowStatus;
  fundedAt: string;
  requestedAt?: string;
  releasedAt?: string;
  report?: DeliveryReport;
}

// What a creator is allowed to see: their take-home pay and how it's worked out.
export interface CreatorPaymentView {
  id: string;
  invoice: string;
  campaign: string;
  brandName: string;
  split: PaymentSplit;
  status: EscrowStatus;
  fundedAt: string;
  requestedAt?: string;
  releasedAt?: string;
  report?: DeliveryReport;
  payoutTo?: PayoutDestination;
}

export interface BrandPaymentSummary {
  totalDeposited: number;
  onHold: number;
  awaitingRelease: number;
  released: number;
}

export interface CreatorPaymentSummary {
  onHold: number;
  awaitingRelease: number;
  paidOut: number;
  totalEarnings: number;
}

// --- form state (shared by server actions and client forms) ---

export type FundField = "creatorId" | "campaign" | "amount" | "method" | "phone";

export type FundFormState =
  | { status: "idle" }
  | { status: "error"; values: Record<FundField, string>; errors: Partial<Record<FundField, string>> }
  | { status: "success"; invoice: string; creatorName: string; amount: number };

export type CashoutField = "summary" | "links" | "method" | "phone";

export type CashoutFormState =
  | { status: "idle" }
  | { status: "error"; values: Record<CashoutField, string>; errors: Partial<Record<CashoutField, string>>; message?: string }
  | { status: "success"; net: number };

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
