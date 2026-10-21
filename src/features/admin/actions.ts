"use server";

import { ENDPOINTS } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { authorizeAction } from "@/lib/auth/action-access";
import { callWithSession } from "@/lib/auth/api-session";
import type { PermissionCode } from "@/lib/domain/vocabulary";
import { adminFailureFrom } from "./failure";
import type { AdminFailure } from "./failure";
import { LIMITS, checkText, decideInputSchema, moderateInputSchema, releaseInputSchema } from "./schemas";

/**
 * Server Actions for administrators. Each checks, first, that the caller is a signed-in ACTIVE administrator holding the exact permission for that area,
 * validates the shape and length of what was typed, and calls the Express API with the session. The API re-checks the permission on every call, decides
 * the new status and the reviewer, writes the audit row and notifies the person; nothing is reported as done unless the API confirmed it.
 */
const invalidInput: AdminFailure = { kind: "validation", message: "Some details could not be read." };

async function gate(permission: PermissionCode): Promise<AdminFailure | null> {
  // The stale cookie is kept on purpose so the page stays as it is and offers "Sign in again".
  const access = await authorizeAction({ role: "admin", permission }, { clearInvalidSession: false });
  if (access.ok) return null;
  return access.reason === "anonymous" ? { kind: "unauthenticated" } : { kind: "forbidden", message: access.message };
}

export type DecisionOutcome = { ok: true; status: string } | { ok: false; error: AdminFailure };

/**
 * A second click or a second tab repeats a decision that was already made: the API answers 409. That is success only when a fresh read shows the
 * status this request wanted; any other state is reported as the conflict it is.
 */
async function settled(error: unknown, wanted: string, read: () => Promise<string>): Promise<DecisionOutcome> {
  if (error instanceof ApiError && error.status === 409) {
    try {
      if ((await read()) === wanted) return { ok: true, status: wanted };
    } catch {
      // fall through to the conflict below
    }
  }
  return { ok: false, error: adminFailureFrom(error) };
}

// ---- users ----------------------------------------------------------------------------------------------------------------------

const USER_ENDPOINT = { suspend: ENDPOINTS.adminUserSuspend, reactivate: ENDPOINTS.adminUserReactivate, reject: ENDPOINTS.adminUserReject } as const;
const USER_STATUS = { suspend: "suspended", reactivate: "active", reject: "rejected" } as const;

/** Suspend an active account, reactivate a suspended one, or reject a pending one. The affected person is notified in the app by the API. */
export async function moderateUserAction(input: unknown): Promise<DecisionOutcome> {
  const denied = await gate("users.moderate");
  if (denied) return { ok: false, error: denied };
  const parsed = moderateInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const { id, kind, reason } = parsed.data;
  const checked = checkText(reason ?? "", LIMITS.userReason, { required: false, singleLine: true });
  if (!checked.ok) return { ok: false, error: { kind: "validation", message: checked.message } };
  try {
    await callWithSession(USER_ENDPOINT[kind], checked.value ? { reason: checked.value } : {}, { id });
    return { ok: true, status: USER_STATUS[kind] };
  } catch (error) {
    return settled(error, USER_STATUS[kind], async () => (await callWithSession(ENDPOINTS.adminUser, undefined, { id })).data.user.status);
  }
}

// ---- creator applications -------------------------------------------------------------------------------------------------------

/** Approve (optional internal note) or reject (a reason the applicant will read) an application that is under review. */
export async function decideApplicationAction(input: unknown): Promise<DecisionOutcome> {
  const denied = await gate("applications.review");
  if (denied) return { ok: false, error: denied };
  const parsed = decideInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const { id, kind, text } = parsed.data;
  const approve = kind === "approve";
  const checked = checkText(text ?? "", approve ? LIMITS.note : LIMITS.rejectReason, { required: !approve });
  if (!checked.ok) return { ok: false, error: { kind: "validation", message: checked.message } };
  try {
    if (approve) await callWithSession(ENDPOINTS.adminApplicationApprove, checked.value ? { note: checked.value } : {}, { id });
    else await callWithSession(ENDPOINTS.adminApplicationReject, { reason: checked.value }, { id });
    return { ok: true, status: approve ? "approved" : "rejected" };
  } catch (error) {
    return settled(error, approve ? "approved" : "rejected", async () => (await callWithSession(ENDPOINTS.adminApplication, undefined, { id })).data.application.status);
  }
}

// ---- campaign review --------------------------------------------------------------------------------------------------------------

/** Approve (optional internal note; the campaign opens and invitations are sent) or reject (a reason the brand will read) a campaign waiting for review. */
export async function decideCampaignAction(input: unknown): Promise<DecisionOutcome> {
  const denied = await gate("campaigns.review");
  if (denied) return { ok: false, error: denied };
  const parsed = decideInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const { id, kind, text } = parsed.data;
  const approve = kind === "approve";
  const checked = checkText(text ?? "", approve ? LIMITS.note : LIMITS.rejectReason, { required: !approve });
  if (!checked.ok) return { ok: false, error: { kind: "validation", message: checked.message } };
  try {
    if (approve) await callWithSession(ENDPOINTS.adminCampaignApprove, checked.value ? { note: checked.value } : {}, { id });
    else await callWithSession(ENDPOINTS.adminCampaignReject, { reason: checked.value }, { id });
    return { ok: true, status: approve ? "open" : "rejected" };
  } catch (error) {
    return settled(error, approve ? "open" : "rejected", async () => (await callWithSession(ENDPOINTS.adminCampaign, undefined, { id })).data.campaign.status);
  }
}

// ---- payments -------------------------------------------------------------------------------------------------------------------

/** Releases a payment to the creator's wallet. The API decides if it is allowed (delivery acknowledged or dispute window passed, no open dispute) and credits the frozen net. */
export async function releasePaymentAction(input: unknown): Promise<DecisionOutcome> {
  const denied = await gate("payments.release");
  if (denied) return { ok: false, error: denied };
  const parsed = releaseInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const { id } = parsed.data;
  try {
    await callWithSession(ENDPOINTS.adminPaymentRelease, {}, { id });
    return { ok: true, status: "released" };
  } catch (error) {
    return settled(error, "released", async () => (await callWithSession(ENDPOINTS.adminPayment, undefined, { id })).data.payment.status);
  }
}
