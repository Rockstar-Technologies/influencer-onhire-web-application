import type { NotificationView } from "@/lib/api/schemas";
import { parseApiDate } from "@/lib/domain/dates";
import { NOTIFICATION_TYPE } from "@/lib/domain/vocabulary";
import type { NotificationType } from "@/lib/domain/vocabulary";

export type NotificationArea = "brand" | "creator";
export type NotificationTone = "good" | "attention" | "neutral";

/** A short plain label for each kind the API can write. The text of the notification itself (title and body) always comes from the API. */
export const NOTIFICATION_KIND_LABELS: Record<NotificationType, string> = {
  account_approved: "Account",
  account_rejected: "Account",
  account_suspended: "Account",
  account_reactivated: "Account",
  admin_message: "Message from the team",
  content_removed: "Content",
  campaign_approved: "Campaign",
  campaign_rejected: "Campaign",
  campaign_cancelled: "Campaign",
  offer_received: "Hire request",
  offer_accepted: "Hire request",
  offer_declined: "Hire request",
  offer_withdrawn: "Hire request",
  offer_cancelled: "Hire request",
  offer_expired: "Hire request",
  payment_held: "Payment",
  payment_failed: "Payment",
  funding_expired: "Payment",
  delivery_report_submitted: "Delivery",
  delivery_acknowledged: "Delivery",
  dispute_opened: "Dispute",
  dispute_withdrawn: "Dispute",
  dispute_resolved: "Dispute",
  dispute_upheld: "Dispute",
  payment_released: "Payment",
  refund_request_decided: "Refund",
  refund_pending: "Refund",
  refund_completed: "Refund",
  refund_cancelled: "Refund",
  withdrawal_requested: "Withdrawal",
  withdrawal_under_review: "Withdrawal",
  withdrawal_approved: "Withdrawal",
  withdrawal_rejected: "Withdrawal",
  withdrawal_cancelled: "Withdrawal",
  withdrawal_completed: "Withdrawal",
  withdrawal_failed: "Withdrawal",
};

const ATTENTION = new Set<string>(["account_rejected", "account_suspended", "campaign_rejected", "payment_failed", "funding_expired", "offer_declined", "offer_expired", "dispute_opened", "dispute_upheld", "withdrawal_rejected", "withdrawal_failed", "content_removed"]);
const GOOD = new Set<string>(["account_approved", "account_reactivated", "campaign_approved", "offer_accepted", "payment_released", "refund_completed", "withdrawal_approved", "withdrawal_completed", "dispute_resolved"]);

/** A kind this app does not know yet is shown as a plain "Notification" (never an error). */
export function kindLabel(type: string): string {
  return NOTIFICATION_TYPE.is(type) ? NOTIFICATION_KIND_LABELS[type] : "Notification";
}

export function toneOf(type: string): NotificationTone {
  return ATTENTION.has(type) ? "attention" : GOOD.has(type) ? "good" : "neutral";
}

/**
 * Where "View" leads. Only pages that exist for the person's own area are used, and the API's `links` decide which record it is about.
 * A notification with no link, or whose record has no screen for this area, has no "View" link.
 */
export function targetOf(links: NotificationView["links"], area: NotificationArea): { href: string; label: string } | null {
  if (links.offerId) return area === "brand" ? { href: "/brand/offers", label: "View hire requests" } : { href: "/creator/requests", label: "View requests" };
  if (links.campaignId && area === "brand") return { href: `/brand/campaigns/${links.campaignId}`, label: "View campaign" };
  if (links.paymentId || links.withdrawalId) return { href: `/${area}/payments`, label: "View payments" };
  return null;
}

/** "3", "99", "99+" — a badge never grows without bound. */
export function badgeText(unread: number): string | null {
  if (!Number.isFinite(unread) || unread <= 0) return null;
  return unread > 99 ? "99+" : String(Math.trunc(unread));
}

export function whenText(createdAt: string, now = Date.now()): string {
  const date = parseApiDate(createdAt);
  if (!date) return "";
  const minutes = Math.floor((now - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
