"use server";

import { ENDPOINTS } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { authorizeAction } from "@/lib/auth/action-access";
import { callWithSession } from "@/lib/auth/api-session";
import { paymentFailureFrom } from "./failure";
import type { PaymentFailure } from "./failure";
import { LIMITS, brandDecisionInputSchema, checkLinks, checkWords, deliveryReportInputSchema, idInputSchema, refundRequestInputSchema, withdrawalInputSchema } from "./schemas";

/**
 * Server Actions for payments. Each checks the signed-in ACTIVE account of the right role first, validates the shape of the input strictly, and calls the
 * API with the session. The API decides ownership, state, amounts and balances and re-checks everything under lock. Nothing here moves money: a delivery
 * report asks for a release, a withdrawal is a REQUEST that staff review, and a refund request only asks staff to look. Nothing is reported as done unless
 * the API confirmed it.
 */
const invalidInput: PaymentFailure = { kind: "validation", message: "Some details could not be read." };

async function gate(role: "creator" | "brand"): Promise<PaymentFailure | null> {
  // The stale cookie is kept on purpose so the page stays as it is and offers "Sign in again".
  const access = await authorizeAction({ role }, { clearInvalidSession: false });
  if (access.ok) return null;
  return access.reason === "anonymous" ? { kind: "unauthenticated" } : { kind: "forbidden", message: access.message };
}

export type PaymentOutcome = { ok: true; status: string } | { ok: false; error: PaymentFailure };

/** A repeated click answers 409; that is success only when a fresh read shows the state this request wanted. */
async function settled(error: unknown, wanted: string, read: () => Promise<string>): Promise<PaymentOutcome> {
  if (error instanceof ApiError && error.status === 409) {
    try {
      if ((await read()) === wanted) return { ok: true, status: wanted };
    } catch {
      // fall through to the conflict below
    }
  }
  return { ok: false, error: paymentFailureFrom(error) };
}

// ---- creator ----------------------------------------------------------------------------------------------------------------------

/** The creator reports delivery of a held payment: the evidence is frozen and the payment waits for release. */
export async function submitDeliveryReportAction(input: unknown): Promise<PaymentOutcome> {
  const denied = await gate("creator");
  if (denied) return { ok: false, error: denied };
  const parsed = deliveryReportInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const summary = checkWords(parsed.data.summary, LIMITS.summary);
  if (!summary.ok) return { ok: false, error: { kind: "validation", message: summary.message } };
  const links = checkLinks(parsed.data.links);
  if (!links.ok) return { ok: false, error: { kind: "validation", message: links.message } };
  const { id } = parsed.data;
  try {
    await callWithSession(ENDPOINTS.creatorDeliveryReport, { summary: summary.value, links: links.links }, { id });
    return { ok: true, status: "requested" };
  } catch (error) {
    return settled(error, "requested", async () => (await callWithSession(ENDPOINTS.creatorPayment, undefined, { id })).data.payment.status);
  }
}

export type WithdrawalOutcome = { ok: true; status: string; replayed: boolean } | { ok: false; error: PaymentFailure };

/**
 * Requests a withdrawal. The key is this request's Idempotency-Key: repeating it can never create a second request. Only the amount and the network are
 * sent; the destination, balance, eligibility and status are the API's. "Requested" is the most this can ever report: it is not a payment.
 */
export async function requestWithdrawalAction(input: unknown): Promise<WithdrawalOutcome> {
  const denied = await gate("creator");
  if (denied) return { ok: false, error: denied };
  const parsed = withdrawalInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const { key, amountXaf, method } = parsed.data;
  try {
    const result = await callWithSession(ENDPOINTS.creatorWithdrawalRequest, { amountXaf, method }, { idempotencyKey: key });
    return { ok: true, status: result.data.withdrawal.status, replayed: result.data.replayed };
  } catch (error) {
    return { ok: false, error: paymentFailureFrom(error) };
  }
}

export async function cancelWithdrawalAction(input: unknown): Promise<PaymentOutcome> {
  const denied = await gate("creator");
  if (denied) return { ok: false, error: denied };
  const parsed = idInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const { id } = parsed.data;
  try {
    await callWithSession(ENDPOINTS.creatorWithdrawalCancel, {}, { id });
    return { ok: true, status: "cancelled" };
  } catch (error) {
    return settled(error, "cancelled", async () => (await callWithSession(ENDPOINTS.creatorWithdrawal, undefined, { id })).data.withdrawal.status);
  }
}

// ---- brand ------------------------------------------------------------------------------------------------------------------------

const BRAND_ENDPOINT = { acknowledge: ENDPOINTS.brandPaymentAcknowledge, dispute: ENDPOINTS.brandPaymentDispute, withdraw_dispute: ENDPOINTS.brandPaymentDisputeWithdraw } as const;

/** Acknowledge a delivery, dispute it (with a reason) or withdraw the open dispute. The payment stays in escrow throughout; the brand never releases money. */
export async function decideDeliveryAction(input: unknown): Promise<PaymentOutcome> {
  const denied = await gate("brand");
  if (denied) return { ok: false, error: denied };
  const parsed = brandDecisionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const { id, kind, reason } = parsed.data;
  let body: Record<string, string> = {};
  if (kind === "dispute") {
    const checked = checkWords(reason ?? "", LIMITS.disputeReason);
    if (!checked.ok) return { ok: false, error: { kind: "validation", message: checked.message } };
    body = { reason: checked.value };
  }
  try {
    await callWithSession(BRAND_ENDPOINT[kind], body, { id });
    return { ok: true, status: kind };
  } catch (error) {
    return { ok: false, error: paymentFailureFrom(error) };
  }
}

/** Asks staff to review a refund for a held payment after the grace period. It is not a refund; no money is returned by it. */
export async function requestRefundReviewAction(input: unknown): Promise<PaymentOutcome> {
  const denied = await gate("brand");
  if (denied) return { ok: false, error: denied };
  const parsed = refundRequestInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const checked = checkWords(parsed.data.reason, LIMITS.refundReason);
  if (!checked.ok) return { ok: false, error: { kind: "validation", message: checked.message } };
  try {
    await callWithSession(ENDPOINTS.brandRefundRequestCreate, { reason: checked.value }, { id: parsed.data.id });
    return { ok: true, status: "requested" };
  } catch (error) {
    return { ok: false, error: paymentFailureFrom(error) };
  }
}

export async function withdrawRefundReviewAction(input: unknown): Promise<PaymentOutcome> {
  const denied = await gate("brand");
  if (denied) return { ok: false, error: denied };
  const parsed = idInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  try {
    await callWithSession(ENDPOINTS.brandRefundRequestWithdraw, {}, { id: parsed.data.id });
    return { ok: true, status: "withdrawn" };
  } catch (error) {
    return { ok: false, error: paymentFailureFrom(error) };
  }
}
