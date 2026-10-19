"use server";

import { ENDPOINTS } from "@/lib/api/endpoints";
import type { NotificationView } from "@/lib/api/schemas";
import { authorizeAction } from "@/lib/auth/action-access";
import { callWithSession } from "@/lib/auth/api-session";
import { notificationFailureFrom } from "./failure";
import type { NotificationFailure } from "./failure";
import { markAllReadInputSchema, markReadInputSchema } from "./schemas";

/**
 * Server Actions for the signed-in person's own notifications (brands and active creators). The session is checked first; the user is never named
 * in a request (the API derives it from the session and answers 404 for anyone else's notification). Nothing is reported as done unless the API confirmed it.
 */
const invalidInput: NotificationFailure = { kind: "forbidden", message: "That request could not be read." };

async function gate(): Promise<NotificationFailure | null> {
  // The stale cookie is kept on purpose so the page stays as it is and offers "Sign in again".
  for (const role of ["brand", "creator"] as const) {
    const access = await authorizeAction({ role }, { clearInvalidSession: false });
    if (access.ok) return null;
    if (access.reason === "anonymous") return { kind: "unauthenticated" };
    if (role === "creator") return { kind: "forbidden", message: access.message };
  }
  return null;
}

export type MarkReadOutcome = { ok: true; notification: NotificationView } | { ok: false; error: NotificationFailure };

/** Marks one notification read. Repeating it is harmless: the API keeps the first read time. */
export async function markNotificationReadAction(input: unknown): Promise<MarkReadOutcome> {
  const denied = await gate();
  if (denied) return { ok: false, error: denied };
  const parsed = markReadInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  try {
    return { ok: true, notification: (await callWithSession(ENDPOINTS.notificationRead, {}, { id: parsed.data.id })).data.notification };
  } catch (error) {
    return { ok: false, error: notificationFailureFrom(error) };
  }
}

export type MarkAllOutcome = { ok: true; updated: number } | { ok: false; error: NotificationFailure };

/** Marks every unread notification of the signed-in person read. */
export async function markAllNotificationsReadAction(input: unknown = {}): Promise<MarkAllOutcome> {
  const denied = await gate();
  if (denied) return { ok: false, error: denied };
  if (!markAllReadInputSchema.safeParse(input).success) return { ok: false, error: invalidInput };
  try {
    return { ok: true, updated: (await callWithSession(ENDPOINTS.notificationsReadAll, {})).data.updated };
  } catch (error) {
    return { ok: false, error: notificationFailureFrom(error) };
  }
}
