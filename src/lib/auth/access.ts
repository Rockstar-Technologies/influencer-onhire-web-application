import type { ApiUser } from "@/lib/api/schemas";

/** What a signed-in session looks like once restored from the API (`GET /auth/me`). */
export interface Session {
  user: ApiUser;
  /** Admin permission codes (empty for brands and creators). */
  permissions: readonly string[];
  expiresAt: string | null;
}

export type Requirement =
  | { role: "brand" }
  | { role: "creator"; allowPending?: boolean }
  | { role: "admin"; permission?: string };

export type AccessDecision =
  | { allowed: true }
  | { allowed: false; reason: "anonymous" | "wrong_role" | "inactive" | "pending_creator" | "missing_permission" };

/**
 * The single authorization rule for the frontend's guards and actions. It is a convenience layer (early redirects, friendly
 * messages): the API still enforces every role, permission and ownership rule itself on every call it receives.
 */
export function decideAccess(session: Session | null, requirement: Requirement): AccessDecision {
  if (!session) return { allowed: false, reason: "anonymous" };
  const { user } = session;
  if (user.role !== requirement.role) return { allowed: false, reason: "wrong_role" };

  if (user.role === "creator") {
    if (user.status === "pending") {
      return requirement.role === "creator" && requirement.allowPending ? { allowed: true } : { allowed: false, reason: "pending_creator" };
    }
    if (user.status !== "active") return { allowed: false, reason: "inactive" };
    return { allowed: true };
  }
  if (user.status !== "active") return { allowed: false, reason: "inactive" };

  if (requirement.role === "admin" && requirement.permission && !session.permissions.includes(requirement.permission)) {
    return { allowed: false, reason: "missing_permission" };
  }
  return { allowed: true };
}
