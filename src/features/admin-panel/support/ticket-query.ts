import type { TicketQuery, TicketStatus } from "@/types/support";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export const TICKET_STATUSES: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

export function parseTicketQuery(params: RawSearchParams): TicketQuery {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const status = first(params.status);
  return {
    q: first(params.q),
    status: TICKET_STATUSES.some((option) => option.value === status) ? (status as TicketStatus) : "all",
  };
}

export function buildTicketsHref(query: TicketQuery) {
  const params = new URLSearchParams();
  if (query.q.trim()) params.set("q", query.q.trim());
  if (query.status !== "all") params.set("status", query.status);
  const search = params.toString();
  return search ? `/admin/support?${search}` : "/admin/support";
}
