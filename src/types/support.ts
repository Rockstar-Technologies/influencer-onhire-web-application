import type { AccountType, TicketPriority as ApiTicketPriority, TicketStatus as ApiTicketStatus } from "@/lib/domain/vocabulary";

export type TicketPriority = ApiTicketPriority;

export type TicketStatus = ApiTicketStatus;

/** Who raised a ticket: a creator or a brand (the API's account types). */
export type TicketRequesterRole = AccountType;

export interface SupportTicket {
  id: string;
  number: number;
  subject: string;
  message: string;
  from: { name: string; role: TicketRequesterRole };
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  // Minutes until an admin first replied; missing while nobody has replied yet.
  firstResponseMinutes?: number;
  resolvedAt?: string;
}

export interface SupportStats {
  openTickets: number;
  urgent: number;
  resolvedThisWeek: number;
  avgResponseHours: number;
}

export interface TicketQuery {
  q: string;
  status: TicketStatus | "all";
}

export interface NewTicketInput {
  subject: string;
  message: string;
  fromName: string;
  fromRole: TicketRequesterRole;
  priority: TicketPriority;
}

export interface AdminUser {
  name: string;
  role: string;
}

// --- new ticket form state (shared by the server action and the dialog) ---

export type NewTicketField = "subject" | "message" | "fromName" | "fromRole" | "priority";

export type NewTicketFormState =
  | { status: "idle" }
  | { status: "error"; values: Record<NewTicketField, string>; errors: Partial<Record<NewTicketField, string>> }
  | { status: "success"; ticket: SupportTicket };
