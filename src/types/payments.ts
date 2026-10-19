import type { PaymentMethodCode, PaymentStatus, WithdrawalStatus } from "@/lib/domain/vocabulary";

/** The API's payment statuses (held, requested, released, refund_pending, refunded). */
export type EscrowStatus = PaymentStatus;

/** The API's method code (`mtn_momo`, `orange_money`); show it with PAYMENT_METHOD_LABELS. */
export type PaymentMethod = PaymentMethodCode;

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
  // When the net payout was added to the creator's balance.
  releasedAt?: string;
  // Set when the creator requests cashout.
  report?: DeliveryReport;
}

export interface DeliveryReport {
  summary: string;
  links: string[];
  submittedAt: string;
}

// What a brand is allowed to see: what they paid and where it is. No fee, no creator payout details.
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
}

export interface CreatorPaymentSummary {
  onHold: number;
  awaitingRelease: number;
  // Net pay already added to the creator's balance, withdrawn or not.
  released: number;
  totalEarnings: number;
}

// --- creator balance and withdrawals ---

export interface Withdrawal {
  id: string;
  creatorId: string;
  amount: number;
  method: PaymentMethod;
  phone: string;
  /** All eight API withdrawal states; the mock data only uses processing and completed. */
  status: WithdrawalStatus;
  requestedAt: string;
  completedAt?: string;
}

export interface CreatorWallet {
  // Released pay minus every withdrawal, including ones still processing.
  available: number;
  processing: number;
  withdrawn: number;
}

// --- form state (shared by server actions and client forms) ---

export type CashoutField = "summary" | "links";

export type CashoutFormState =
  | { status: "idle" }
  | { status: "error"; values: Record<CashoutField, string>; errors: Partial<Record<CashoutField, string>>; message?: string }
  | { status: "success"; net: number };

export type WithdrawField = "amount" | "method" | "phone";

export type WithdrawFormState =
  | { status: "idle" }
  | { status: "error"; values: Record<WithdrawField, string>; errors: Partial<Record<WithdrawField, string>>; message?: string }
  | { status: "success"; withdrawal: Withdrawal };

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
