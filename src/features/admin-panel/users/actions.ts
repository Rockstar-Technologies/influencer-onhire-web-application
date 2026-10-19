"use server";

import { revalidatePath } from "next/cache";
import { authorizeAction } from "@/lib/auth/action-access";
import { ADMIN_ROLE } from "@/lib/domain/vocabulary";
import type { AdminRoleCode } from "@/lib/domain/vocabulary";
import {
  applyUserAction,
  dismissSecurityAlert,
  inviteTeamMember,
  resolveModerationFlag,
  sendUserMessage,
  setUserFlagged,
} from "@/services/user-management.service";
import {
  type ActionResult,
  type BulkAction,
  type InviteField,
  type InviteFormState,
} from "@/types/user-management";

// Server Actions are reachable by direct POST, so every argument is validated here.
// Every action first checks the signed-in administrator's permission (the same codes the API enforces).

const BULK_ACTIONS: BulkAction[] = ["approve", "reject", "suspend", "reactivate"];
const MAX_BATCH = 200;
const PAST_TENSE: Record<BulkAction, string> = {
  approve: "approved",
  reject: "rejected",
  suspend: "suspended",
  reactivate: "reactivated",
};

function validIds(ids: unknown): ids is string[] {
  return Array.isArray(ids) && ids.length > 0 && ids.length <= MAX_BATCH && ids.every((id) => typeof id === "string");
}

function refresh() {
  revalidatePath("/admin/users", "layout");
}

export async function userStatusAction(ids: string[], action: BulkAction): Promise<ActionResult> {
  const access = await authorizeAction({ role: "admin", permission: action === "approve" ? "applications.review" : "users.moderate" });
  if (!access.ok) return { ok: false, message: access.message };
  if (!validIds(ids) || !BULK_ACTIONS.includes(action)) return { ok: false, message: "Invalid request." };

  const changed = await applyUserAction(ids, action);
  refresh();
  const skipped = ids.length - changed.length;
  if (changed.length === 0) return { ok: false, message: `No selected users could be ${PAST_TENSE[action]}.` };
  const noun = changed.length === 1 ? "user" : "users";
  return {
    ok: true,
    message: `${changed.length} ${noun} ${PAST_TENSE[action]} and notified.${skipped ? ` ${skipped} skipped (status didn't allow it).` : ""}`,
  };
}

export async function messageUsersAction(ids: string[], subject: string, body: string): Promise<ActionResult> {
  const access = await authorizeAction({ role: "admin", permission: "users.moderate" });
  if (!access.ok) return { ok: false, message: access.message };
  if (!validIds(ids) || typeof subject !== "string" || typeof body !== "string") return { ok: false, message: "Invalid request." };
  const cleanSubject = subject.trim();
  const cleanBody = body.trim();
  if (cleanSubject.length < 3 || cleanSubject.length > 120) return { ok: false, message: "Enter a subject between 3 and 120 characters." };
  if (cleanBody.length < 10 || cleanBody.length > 2000) return { ok: false, message: "Write a message between 10 and 2000 characters." };

  const sent = await sendUserMessage(ids, cleanSubject, cleanBody);
  refresh();
  return { ok: true, message: `Message sent to ${sent} ${sent === 1 ? "user" : "users"}.` };
}

export async function toggleFlagAction(id: string, flagged: boolean): Promise<ActionResult> {
  const access = await authorizeAction({ role: "admin", permission: "users.moderate" });
  if (!access.ok) return { ok: false, message: access.message };
  if (typeof id !== "string" || typeof flagged !== "boolean") return { ok: false, message: "Invalid request." };
  const user = await setUserFlagged(id, flagged);
  if (!user) return { ok: false, message: "User not found." };
  refresh();
  return { ok: true, message: flagged ? `${user.name} flagged for review.` : `Flag removed from ${user.name}.` };
}

export async function dismissAlertAction(id: string): Promise<ActionResult> {
  const access = await authorizeAction({ role: "admin", permission: "alerts.manage" });
  if (!access.ok) return { ok: false, message: access.message };
  if (typeof id !== "string") return { ok: false, message: "Invalid request." };
  const dismissed = await dismissSecurityAlert(id);
  refresh();
  return dismissed ? { ok: true, message: "Alert dismissed." } : { ok: false, message: "Alert already handled." };
}

export async function resolveFlagAction(id: string, decision: "remove" | "dismiss"): Promise<ActionResult> {
  const access = await authorizeAction({ role: "admin", permission: "moderation.manage" });
  if (!access.ok) return { ok: false, message: access.message };
  if (typeof id !== "string" || (decision !== "remove" && decision !== "dismiss")) return { ok: false, message: "Invalid request." };
  const flag = await resolveModerationFlag(id, decision);
  refresh();
  if (!flag) return { ok: false, message: "This report was already handled." };
  return { ok: true, message: decision === "remove" ? `Content removed and ${flag.userName} notified.` : "Report dismissed." };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function inviteTeamMemberAction(_previous: InviteFormState, formData: FormData): Promise<InviteFormState> {
  const access = await authorizeAction({ role: "admin", permission: "team.manage" });
  if (!access.ok) return { status: "error", values: { name: "", email: "", role: "" }, errors: { email: access.message } };
  const read = (field: InviteField) => {
    const value = formData.get(field);
    return typeof value === "string" ? value.trim() : "";
  };
  const values = { name: read("name"), email: read("email"), role: read("role") };

  const errors: Partial<Record<InviteField, string>> = {};
  if (values.name.length < 2 || values.name.length > 80) errors.name = "Enter the person's full name.";
  if (!EMAIL_PATTERN.test(values.email) || values.email.length > 120) errors.email = "Enter a valid email address.";
  if (!ADMIN_ROLE.is(values.role)) errors.role = "Choose a role.";
  if (Object.keys(errors).length > 0) return { status: "error", values, errors };

  const member = await inviteTeamMember({ name: values.name, email: values.email, role: values.role as AdminRoleCode }); // validated above by ADMIN_ROLE.is
  if (!member) return { status: "error", values, errors: { email: "This person is already on the team." } };
  refresh();
  return { status: "success", member };
}
