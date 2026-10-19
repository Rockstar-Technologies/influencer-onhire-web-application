"use server";

import { revalidatePath } from "next/cache";
import { authorizeAction } from "@/lib/auth/action-access";
import { createSupportTicket } from "@/services/support.service";
import type {
  NewTicketField,
  NewTicketFormState,
  TicketPriority,
  TicketRequesterRole,
} from "@/types/support";

const PRIORITIES: TicketPriority[] = ["urgent", "normal", "low"];
const ROLES: TicketRequesterRole[] = ["influencer", "brand"];

// Server Actions are reachable by direct POST, so every value is validated here.
// The caller must be a signed-in administrator who manages tickets.
export async function createTicketAction(_previous: NewTicketFormState, formData: FormData): Promise<NewTicketFormState> {
  const access = await authorizeAction({ role: "admin", permission: "tickets.manage" });
  const read = (field: NewTicketField) => {
    const value = formData.get(field);
    return typeof value === "string" ? value.trim() : "";
  };
  const values = {
    subject: read("subject"),
    message: read("message"),
    fromName: read("fromName"),
    fromRole: read("fromRole"),
    priority: read("priority"),
  };

  if (!access.ok) return { status: "error", values, errors: { subject: access.message } };

  const errors: Partial<Record<NewTicketField, string>> = {};
  if (values.subject.length < 5 || values.subject.length > 120) errors.subject = "Enter a subject between 5 and 120 characters.";
  if (values.fromName.length < 2 || values.fromName.length > 80) errors.fromName = "Enter the name of the influencer or brand.";
  if (!ROLES.includes(values.fromRole as TicketRequesterRole)) errors.fromRole = "Choose influencer or brand.";
  if (!PRIORITIES.includes(values.priority as TicketPriority)) errors.priority = "Choose a priority.";
  if (values.message.length < 10 || values.message.length > 2000) errors.message = "Describe the issue in 10 to 2000 characters.";

  if (Object.keys(errors).length > 0) return { status: "error", values, errors };

  const ticket = await createSupportTicket({
    subject: values.subject,
    message: values.message,
    fromName: values.fromName,
    fromRole: values.fromRole as TicketRequesterRole,
    priority: values.priority as TicketPriority,
  });
  revalidatePath("/admin/support");
  return { status: "success", ticket };
}
