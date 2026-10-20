"use server";

import { ENDPOINTS } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { authorizeAction } from "@/lib/auth/action-access";
import { callWithSession } from "@/lib/auth/api-session";
import type { PermissionCode } from "@/lib/domain/vocabulary";
import { adminFailureFrom } from "./failure";
import type { AdminFailure } from "./failure";
import { FINANCE_LIMITS, dismissInputSchema, issueInputSchema, refundCancelInputSchema, refundInputSchema, refundRequestDecisionInputSchema, upholdInputSchema, withdrawalDecisionInputSchema } from "./finance-schemas";
import { checkText } from "./schemas";

/**
 * Server Actions for finance staff: dispute outcomes, refund requests and refunds, withdrawal review and reconciliation issues. Each checks, first, that the
 * caller is a signed-in ACTIVE administrator holding the exact permission, validates the shape and length of what was typed, and calls the API with the session.
 * The API re-checks the permission, decides every state change, enforces the two-administrator rule and the idempotency, writes the audit row and notifies the
 * people involved. Nothing here claims that money was released, refunded or paid: each result names only what the API confirmed (a recorded decision).
 */
const invalidInput: AdminFailure = { kind: "validation", message: "Some details could not be read." };

async function gate(permission: PermissionCode): Promise<AdminFailure | null> {
  // The stale cookie is kept on purpose so the page stays as it is and offers "Sign in again".
  const access = await authorizeAction({ role: "admin", permission }, { clearInvalidSession: false });
  if (access.ok) return null;
  return access.reason === "anonymous" ? { kind: "unauthenticated" } : { kind: "forbidden", message: access.message };
}

export type FinanceOutcome = { ok: true; status: string } | { ok: false; error: AdminFailure };

/** A repeated click answers 409; that is success only when a fresh read shows the state this request wanted. */
async function settled(error: unknown, wanted: string, read: () => Promise<string | null | undefined>): Promise<FinanceOutcome> {
  if (error instanceof ApiError && error.status === 409) {
    try {
      if ((await read()) === wanted) return { ok: true, status: wanted };
    } catch {
      // fall through to the conflict below
    }
  }
  return { ok: false, error: adminFailureFrom(error) };
}

const paymentDispute = async (id: string) => (await callWithSession(ENDPOINTS.adminPayment, undefined, { id })).data.payment.dispute?.status ?? null;

// ---- disputes ---------------------------------------------------------------------------------------------------------------------

/** Dismisses an open dispute (the payment may then be released). Needs the note; the API refuses it while an upheld-outcome proposal is pending. */
export async function dismissDisputeAction(input: unknown): Promise<FinanceOutcome> {
  const denied = await gate("payments.release");
  if (denied) return { ok: false, error: denied };
  const parsed = dismissInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const checked = checkText(parsed.data.note, FINANCE_LIMITS.disputeNote, { required: true });
  if (!checked.ok) return { ok: false, error: { kind: "validation", message: checked.message } };
  const { id } = parsed.data;
  try {
    await callWithSession(ENDPOINTS.adminDisputeDismiss, { resolution: "dismissed", note: checked.value }, { id });
    return { ok: true, status: "dismissed" };
  } catch (error) {
    return settled(error, "resolved_against", () => paymentDispute(id)).then((r) => (r.ok ? { ok: true, status: "dismissed" } : r));
  }
}

const UPHOLD = { propose: ENDPOINTS.adminUpholdPropose, confirm: ENDPOINTS.adminUpholdConfirm, decline: ENDPOINTS.adminUpholdDecline, withdraw: ENDPOINTS.adminUpholdWithdraw } as const;

/**
 * The two-administrator upheld-dispute outcome: one administrator proposes, a DIFFERENT one confirms or declines, the proposer may withdraw. The API enforces
 * "different administrator" (here and in the database); this action never decides who is who. An upheld dispute returns no money.
 */
export async function upholdDisputeAction(input: unknown): Promise<FinanceOutcome> {
  const denied = await gate("disputes.uphold");
  if (denied) return { ok: false, error: denied };
  const parsed = upholdInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const { id, kind } = parsed.data;
  let body: Record<string, string> = {};
  if (kind !== "withdraw") {
    const checked = checkText(parsed.data.note ?? "", FINANCE_LIMITS.disputeNote, { required: true });
    if (!checked.ok) return { ok: false, error: { kind: "validation", message: checked.message } };
    body = { note: checked.value };
  }
  try {
    await callWithSession(UPHOLD[kind], body, { id });
    return { ok: true, status: kind };
  } catch (error) {
    // Only a repeated confirmation can be verified as already done; every other repeat is reported as the conflict it is.
    if (kind === "confirm") return settled(error, "resolved_in_favour", () => paymentDispute(id)).then((r) => (r.ok ? { ok: true, status: "confirm" } : r));
    return { ok: false, error: adminFailureFrom(error) };
  }
}

// ---- refund review requests ----------------------------------------------------------------------------------------------------

/** Records the staff decision on a brand's refund review request. Accepting does NOT create or complete a refund. */
export async function decideRefundRequestAction(input: unknown): Promise<FinanceOutcome> {
  const denied = await gate("payments.refund");
  if (denied) return { ok: false, error: denied };
  const parsed = refundRequestDecisionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const { id, kind } = parsed.data;
  const checked = checkText(parsed.data.note, FINANCE_LIMITS.requestNote, { required: true });
  if (!checked.ok) return { ok: false, error: { kind: "validation", message: checked.message } };
  const wanted = kind === "accept" ? "accepted" : "rejected";
  try {
    await callWithSession(kind === "accept" ? ENDPOINTS.adminRefundRequestAccept : ENDPOINTS.adminRefundRequestReject, { note: checked.value }, { id });
    return { ok: true, status: wanted };
  } catch (error) {
    return settled(error, wanted, async () => (await callWithSession(ENDPOINTS.adminRefundRequest, undefined, { id })).data.request.status);
  }
}

// ---- refunds ----------------------------------------------------------------------------------------------------------------------

/**
 * Records a full refund of a HELD payment. The amount is never an input: it is read from the API as the payment's gross, and the API accepts only exactly
 * that. A simulated refund moves no money and a real one is only a recorded decision (no provider refund exists), so the result says "recorded".
 */
export async function createRefundAction(input: unknown): Promise<FinanceOutcome> {
  const denied = await gate("payments.refund");
  if (denied) return { ok: false, error: denied };
  const parsed = refundInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const { paymentId, key } = parsed.data;
  const reason = checkText(parsed.data.reason, FINANCE_LIMITS.refundReason, { required: true });
  if (!reason.ok) return { ok: false, error: { kind: "validation", message: reason.message } };
  try {
    const payment = (await callWithSession(ENDPOINTS.adminPayment, undefined, { id: paymentId })).data.payment;
    if (payment.status !== "held" || !payment.actions.canRefund) return { ok: false, error: { kind: "conflict", code: "payment_not_held", message: "Only a payment that is still held in escrow can be refunded." } };
    const result = await callWithSession(ENDPOINTS.adminRefundCreate, { amountXaf: payment.amountXaf, reason: reason.value }, { id: paymentId, idempotencyKey: key });
    return { ok: true, status: result.data.refund.status };
  } catch (error) {
    return { ok: false, error: adminFailureFrom(error) };
  }
}

export async function cancelRefundAction(input: unknown): Promise<FinanceOutcome> {
  const denied = await gate("payments.refund");
  if (denied) return { ok: false, error: denied };
  const parsed = refundCancelInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const checked = checkText(parsed.data.note, FINANCE_LIMITS.refundNote, { required: true });
  if (!checked.ok) return { ok: false, error: { kind: "validation", message: checked.message } };
  const { id } = parsed.data;
  try {
    await callWithSession(ENDPOINTS.adminRefundCancel, { note: checked.value }, { id });
    return { ok: true, status: "cancelled" };
  } catch (error) {
    return settled(error, "cancelled", async () => (await callWithSession(ENDPOINTS.adminRefund, undefined, { id })).data.refund.status);
  }
}

// ---- withdrawal review ----------------------------------------------------------------------------------------------------------

/**
 * Approves (only a request under review) or rejects a withdrawal request. Approving means only "cleared for a future payout": no payout provider exists and
 * nothing is paid. Rejecting returns the reserved amount to the creator's balance.
 */
export async function decideWithdrawalAction(input: unknown): Promise<FinanceOutcome> {
  const denied = await gate("withdrawals.review");
  if (denied) return { ok: false, error: denied };
  const parsed = withdrawalDecisionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const { id, kind } = parsed.data;
  const approve = kind === "approve";
  const checked = checkText(parsed.data.note ?? "", FINANCE_LIMITS.withdrawalNote, { required: !approve });
  if (!checked.ok) return { ok: false, error: { kind: "validation", message: checked.message } };
  const wanted = approve ? "approved" : "rejected";
  try {
    await callWithSession(approve ? ENDPOINTS.adminWithdrawalApprove : ENDPOINTS.adminWithdrawalReject, checked.value ? { note: checked.value } : {}, { id });
    return { ok: true, status: wanted };
  } catch (error) {
    return settled(error, wanted, async () => (await callWithSession(ENDPOINTS.adminWithdrawal, undefined, { id })).data.withdrawal.status);
  }
}

// ---- reconciliation issues -------------------------------------------------------------------------------------------------------

/** Resolves or dismisses a reconciliation issue with a note: an audited annotation that never changes a payment. */
export async function actOnIssueAction(input: unknown): Promise<FinanceOutcome> {
  const denied = await gate("reconciliation.resolve");
  if (denied) return { ok: false, error: denied };
  const parsed = issueInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const { id, kind } = parsed.data;
  const checked = checkText(parsed.data.note, FINANCE_LIMITS.issueNote, { required: true });
  if (!checked.ok) return { ok: false, error: { kind: "validation", message: checked.message } };
  const wanted = kind === "resolve" ? "resolved" : "dismissed";
  try {
    await callWithSession(kind === "resolve" ? ENDPOINTS.adminPaymentIssueResolve : ENDPOINTS.adminPaymentIssueDismiss, { note: checked.value }, { id });
    return { ok: true, status: wanted };
  } catch (error) {
    return settled(error, wanted, async () => (await callWithSession(ENDPOINTS.adminPaymentIssue, undefined, { id })).data.issue.resolution);
  }
}
