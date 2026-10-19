import { PAYMENT_METHOD_LABELS } from "@/lib/domain/labels";
import type { EscrowStatus, PaymentMethod } from "@/types/payment";

export const METHOD_LABELS: Record<PaymentMethod, string> = PAYMENT_METHOD_LABELS;

export const STATUS_LABELS: Record<EscrowStatus, string> = {
  held: "On Hold (Escrow)",
  requested: "Payout Requested",
  released: "Released",
  refund_pending: "Refund Pending",
  refunded: "Refunded",
};

export const STATUS_STYLES: Record<EscrowStatus, string> = {
  held: "bg-primary-light text-primary",
  requested: "bg-warning/10 text-warning",
  released: "bg-success/10 text-success",
  refund_pending: "bg-warning/10 text-warning",
  refunded: "bg-border-light text-body",
};

export function formatAmount(amount: number) {
  return `${amount.toLocaleString("en-US")} FCFA`;
}

export function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatNumber(amount: number) {
  return amount.toLocaleString("en-US");
}
