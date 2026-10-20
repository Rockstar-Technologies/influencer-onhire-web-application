import { z } from "zod";

/**
 * What the browser may send to the finance Server Actions (reachable by a direct POST). STRICT: a record id, the kind of decision and the administrator's own
 * note. The refund amount, the actor, the second administrator, every status and every permission are never inputs: the API decides them from the session.
 */
const note = z.string().max(1100);
const key = z.string().regex(/^[A-Za-z0-9_-]{8,100}$/);

export const dismissInputSchema = z.strictObject({ id: z.uuid(), note });
export const upholdInputSchema = z.strictObject({ id: z.uuid(), kind: z.enum(["propose", "confirm", "decline", "withdraw"]), note: note.optional() });
export const refundRequestDecisionInputSchema = z.strictObject({ id: z.uuid(), kind: z.enum(["accept", "reject"]), note });
export const refundInputSchema = z.strictObject({ paymentId: z.uuid(), key, reason: note });
export const refundCancelInputSchema = z.strictObject({ id: z.uuid(), note });
export const withdrawalDecisionInputSchema = z.strictObject({ id: z.uuid(), kind: z.enum(["approve", "reject"]), note: note.optional() });
export const issueInputSchema = z.strictObject({ id: z.uuid(), kind: z.enum(["resolve", "dismiss"]), note });

/** The lengths the API enforces (backend refund.schemas.ts, workflows.schemas.ts, payments.schemas.ts, withdrawal.schemas.ts). */
export const FINANCE_LIMITS = {
  disputeNote: { min: 5, max: 1000 },
  refundReason: { min: 5, max: 500 },
  refundNote: { min: 5, max: 500 },
  requestNote: { min: 5, max: 1000 },
  withdrawalNote: { min: 5, max: 500 },
  issueNote: { min: 5, max: 500 },
} as const;

export const newRefundKey = () => `rf-${globalThis.crypto.randomUUID()}`;
