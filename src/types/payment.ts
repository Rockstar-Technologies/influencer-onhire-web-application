import type { PaymentMethodCode, PaymentStatus } from "@/lib/domain/vocabulary";

/** The API's payment statuses (held, requested, released, refund_pending, refunded). */
export type EscrowStatus = PaymentStatus;

export type PaymentMethod = PaymentMethodCode;

export interface EscrowStep {
  id: string;
  title: string;
  description: string;
}

