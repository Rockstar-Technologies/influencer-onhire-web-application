import type { AdminUser, NewTicketInput, SupportStats, SupportTicket, TicketQuery } from "@/types/support";
import { MOCK_CURRENT_ADMIN, MOCK_TICKETS } from "./mock/support.mock";

export async function getCurrentAdmin(): Promise<AdminUser> {
  // TODO: replace with the signed-in admin from the auth session once accounts exist
  return MOCK_CURRENT_ADMIN;
}

export async function listSupportTickets(query: TicketQuery): Promise<SupportTicket[]> {
  // TODO: replace with `fetch("/api/admin/tickets?" + params)` once the backend exists
  const term = query.q.trim().toLowerCase().replace(/^#/, "");
  return MOCK_TICKETS.filter((ticket) => query.status === "all" || ticket.status === query.status)
    .filter(
      (ticket) =>
        !term ||
        ticket.subject.toLowerCase().includes(term) ||
        ticket.from.name.toLowerCase().includes(term) ||
        String(ticket.number).includes(term),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSupportStats(): Promise<SupportStats> {
  // TODO: replace with `fetch("/api/admin/tickets/stats")` — computed from the same mock
  // tickets for now so the cards always agree with the table.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
  const unresolved = MOCK_TICKETS.filter((ticket) => ticket.status !== "resolved");
  const responseTimes = MOCK_TICKETS.flatMap((ticket) => ticket.firstResponseMinutes ?? []);
  const avgMinutes = responseTimes.reduce((sum, minutes) => sum + minutes, 0) / (responseTimes.length || 1);

  return {
    openTickets: unresolved.length,
    urgent: unresolved.filter((ticket) => ticket.priority === "urgent").length,
    resolvedThisWeek: MOCK_TICKETS.filter((ticket) => ticket.resolvedAt && ticket.resolvedAt >= weekAgo).length,
    avgResponseHours: Math.round((avgMinutes / 60) * 10) / 10,
  };
}

export async function createSupportTicket(input: NewTicketInput): Promise<SupportTicket> {
  // TODO: replace with `fetch("/api/admin/tickets", { method: "POST", body: JSON.stringify(input) })`
  const number = Math.max(0, ...MOCK_TICKETS.map((ticket) => ticket.number)) + 1;
  const timestamp = new Date().toISOString();
  const ticket: SupportTicket = {
    id: `t-${number}`,
    number,
    subject: input.subject,
    message: input.message,
    from: { name: input.fromName, role: input.fromRole },
    priority: input.priority,
    status: "open",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  MOCK_TICKETS.push(ticket);
  return ticket;
}
