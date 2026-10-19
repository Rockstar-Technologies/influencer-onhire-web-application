import "server-only";
import { decideAccess } from "./access";
import type { Requirement, Session } from "./access";
import { getSessionForAction } from "./session";

export type ActionAccess = { ok: true; session: Session } | { ok: false; message: string };

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
export async function authorizeAction(requirement: Requirement): Promise<ActionAccess> {
  const session = await getSessionForAction();
  const decision = decideAccess(session, requirement);
  if (decision.allowed && session) return { ok: true, session };
  return { ok: false, message: MESSAGES[decision.allowed ? "wrong_role" : decision.reason] };
}

export const PAYMENTS_NOT_CONNECTED =
  "Payments are not connected to the live service yet, so nothing was submitted and no money has been moved.";
