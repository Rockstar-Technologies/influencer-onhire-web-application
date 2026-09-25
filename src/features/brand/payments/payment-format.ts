import type { EscrowStatus, PaymentMethod } from "@/types/payment";

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  mtn_momo: "MTN MoMo",
  orange_money: "Orange Money",
};

export const STATUS_LABELS: Record<EscrowStatus, string> = {
  on_hold: "On Hold (Escrow)",
  payout_requested: "Payout Requested",
  released: "Released",
};

export const STATUS_STYLES: Record<EscrowStatus, string> = {
  on_hold: "bg-primary-light text-primary",
  payout_requested: "bg-warning/10 text-warning",
  released: "bg-success/10 text-success",
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
