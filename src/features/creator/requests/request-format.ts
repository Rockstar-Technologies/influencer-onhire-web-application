import { parseApiDate } from "@/lib/domain/dates";

const DAY_MS = 86_400_000;

function toDate(value: string) {
  // Accepts both calendar dates and full API timestamps; an unreadable value becomes the epoch rather than an invalid Date.
  return parseApiDate(value) ?? new Date(0);
}

export function formatFrs(amount: number) {
  return `${amount.toLocaleString("en-US")} Frs`;
}

export function formatFcfa(amount: number) {
  return `${amount.toLocaleString("en-US")} FCFA`;
}

export function formatDate(value: string) {
  return toDate(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatReceived(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - toDate(value).getTime()) / DAY_MS);
  if (days <= 0) return "received today";
  if (days === 1) return "received yesterday";
  return `received ${days} days ago`;
}
