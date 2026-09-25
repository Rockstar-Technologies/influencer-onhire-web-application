import type { PaymentMethod } from "@/types/payment";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  mtn_momo: "MTN MoMo",
  orange_money: "Orange Money",
};

export function formatNumber(amount: number) {
  return amount.toLocaleString("en-US");
}

export function formatFcfa(amount: number) {
  return `${formatNumber(amount)} FCFA`;
}

export function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Accepts "1,080,000", "1 080 000" or "1080000 FCFA".
export function parseAmount(value: string) {
  return Number(value.replace(/[\s,]|fcfa/gi, ""));
}

// Cameroon mobile money numbers: 9 digits starting with 6, optional +237 prefix.
export function normalizeCameroonPhone(value: string) {
  return value.replace(/[\s-]/g, "").replace(/^\+?237/, "");
}

export function isCameroonMobile(value: string) {
  return /^6\d{8}$/.test(normalizeCameroonPhone(value));
}

export function formatCameroonPhone(value: string) {
  return normalizeCameroonPhone(value).replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
}
