import type { EscrowStatus, PaymentQuery } from "@/types/payments";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export const ESCROW_STATUSES: { value: EscrowStatus; label: string }[] = [
  { value: "held", label: "On hold (escrow)" },
  { value: "requested", label: "Payout requested" },
  { value: "released", label: "Released" },
];

export function parsePaymentQuery(params: RawSearchParams): PaymentQuery {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const status = first(params.status);
  return {
    q: first(params.q),
    status: ESCROW_STATUSES.some((option) => option.value === status) ? (status as EscrowStatus) : "all",
  };
}

export function buildPaymentsHref(query: PaymentQuery) {
  const params = new URLSearchParams();
  if (query.q.trim()) params.set("q", query.q.trim());
  if (query.status !== "all") params.set("status", query.status);
  const search = params.toString();
  return search ? `/admin/payments?${search}` : "/admin/payments";
}
