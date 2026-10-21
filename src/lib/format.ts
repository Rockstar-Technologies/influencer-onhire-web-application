import { parseApiDate } from "@/lib/domain/dates";

export { PAYMENT_METHOD_LABELS } from "@/lib/domain/labels";

export function formatNumber(amount: number) {
  return amount.toLocaleString("en-US");
}

export function formatFcfa(amount: number) {
  return `${formatNumber(amount)} FCFA`;
}

export function formatDate(value: string) {
  const date = parseApiDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
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

export function formatFrs(amount: number) {
  return `${formatNumber(amount)} Frs`;
}

// 1200000 -> "1.2M", 620000 -> "620K"
export function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
