import type { AdminUserDetail } from "@/lib/api/schemas";
import { parseApiDate } from "@/lib/domain/dates";

export function dateTime(value: string | null | undefined): string {
  const date = parseApiDate(value);
  return date ? date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

export const ROLE_LABELS: Record<string, string> = { brand: "Brand", creator: "Creator", admin: "Administrator" };
export const ACCOUNT_STATUS_TEXT: Record<string, string> = { pending: "Pending", active: "Active", suspended: "Suspended", rejected: "Rejected" };
export const APPLICATION_STATUS_TEXT: Record<string, string> = { draft: "Draft", under_review: "Under review", approved: "Approved", rejected: "Rejected" };
export const REVIEW_CAMPAIGN_STATUS_TEXT: Record<string, string> = {
  draft: "Draft",
  pending_review: "Waiting for review",
  open: "Open",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};
export const PAYMENT_STATUS_TEXT: Record<string, string> = { held: "Held in escrow", requested: "Delivery reported", released: "Released", refund_pending: "Refund pending", refunded: "Refunded" };

/** Always has a readable label; a value this app doesn't know is "Unknown" rather than a crash or a guess. */
export function label(table: Record<string, string>, value: unknown): string {
  return typeof value === "string" && Object.hasOwn(table, value) ? (table[value] as string) : "Unknown";
}

export type UserAction = "suspend" | "reactivate" | "reject";

/**
 * Which moderation buttons make sense for an account in this state, from the API's own rules (docs/ADMIN_ACCOUNT_MANAGEMENT.md): suspend an active
 * account, reactivate a suspended one, reject a pending one. These only decide which buttons are SHOWN: the API re-checks the state, the actor's
 * permission, self-moderation and the last Super Admin on every request.
 */
export function userActions(user: Pick<AdminUserDetail, "status" | "role">, self: { id: string; canManageAdmins: boolean }, targetId: string): UserAction[] {
  if (targetId === self.id) return [];
  if (user.role === "admin" && !self.canManageAdmins) return [];
  switch (user.status) {
    case "active":
      return ["suspend"];
    case "suspended":
      return ["reactivate"];
    case "pending":
      return ["reject"];
    default:
      return [];
  }
}

export const USER_ACTION_TEXT: Record<UserAction, { label: string; confirm: string; done: string }> = {
  suspend: { label: "Suspend account", confirm: "Suspend this account? The person is signed out everywhere and cannot sign in until it is reactivated.", done: "The account was suspended and the person was notified in the app." },
  reactivate: { label: "Reactivate account", confirm: "Reactivate this account? The person will have to sign in again.", done: "The account was reactivated and the person was notified in the app." },
  reject: { label: "Reject account", confirm: "Reject this pending account? This is final.", done: "The account was rejected and the person was notified in the app." },
};
