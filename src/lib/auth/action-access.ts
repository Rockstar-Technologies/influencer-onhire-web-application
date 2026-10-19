import "server-only";
import { decideAccess } from "./access";
import type { Requirement, Session } from "./access";
import { getSessionForAction } from "./session";

export type DenialReason = "anonymous" | "wrong_role" | "inactive" | "pending_creator" | "missing_permission";

export type ActionAccess = { ok: true; session: Session } | { ok: false; message: string; reason: DenialReason };

const MESSAGES = {
  anonymous: "Your session has ended. Please sign in again.",
  wrong_role: "This action isn't available for your account.",
  inactive: "This action isn't available for your account.",
  pending_creator: "Your creator application must be approved before you can do this.",
  missing_permission: "You don't have permission to do this.",
} as const;

/**
 * First line of every Server Action that does anything on behalf of a user. Server Actions are reachable by a direct POST, so each
 * one must check the session itself: page guards and layouts do not protect them. The API remains the final authority.
 */
export async function authorizeAction(requirement: Requirement, options: { clearInvalidSession?: boolean } = {}): Promise<ActionAccess> {
  const session = await getSessionForAction({ clearInvalid: options.clearInvalidSession ?? true });
  const decision = decideAccess(session, requirement);
  if (decision.allowed && session) return { ok: true, session };
  const reason: DenialReason = decision.allowed ? "wrong_role" : decision.reason;
  return { ok: false, message: MESSAGES[reason], reason };
}

export const PAYMENTS_NOT_CONNECTED =
  "Payments are not connected to the live service yet, so nothing was submitted and no money has been moved.";
