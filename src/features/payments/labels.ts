import type { BrandPayment, CreatorPayment } from "@/lib/api/schemas";

export interface StatusInfo {
  label: string;
  /** What this status means, using only what the API reports. Never claims money was sent unless the status is `completed`. */
  note: string;
  tone: "info" | "warning" | "success" | "neutral" | "danger";
}

/**
 * Withdrawals are REQUESTS reviewed by staff. No payout provider is connected, so an approved request is only cleared for a future payout: only the API's
 * own `completed` status (which the platform cannot reach today) may be described as paid.
 */
const WITHDRAWAL: Record<string, StatusInfo> = {
  requested: { label: "Requested", note: "Waiting for review. The amount is set aside from your balance. This is not a payment.", tone: "info" },
  under_review: { label: "Under review", note: "Our team is reviewing this request. The amount stays set aside. This is not a payment.", tone: "warning" },
  approved: { label: "Approved", note: "Cleared for a future payout. It has not been paid and no money has been sent.", tone: "info" },
  rejected: { label: "Rejected", note: "This request was not approved. The amount was returned to your balance.", tone: "danger" },
  cancelled: { label: "Cancelled", note: "You cancelled this request. The amount was returned to your balance.", tone: "neutral" },
  processing: { label: "Processing", note: "The payout is being processed. It has not been confirmed as paid yet.", tone: "warning" },
  completed: { label: "Completed", note: "The payout was confirmed as completed.", tone: "success" },
  failed: { label: "Payout failed", note: "The payout did not go through. Contact support if the amount is not back in your balance.", tone: "danger" },
};

export function withdrawalInfo(status: string): StatusInfo {
  return WITHDRAWAL[status] ?? { label: "Unknown", note: "We don't recognise this status. Reload the page.", tone: "neutral" };
}

export const WITHDRAWAL_CANCELLABLE: ReadonlySet<string> = new Set(["requested", "under_review"]);

export const METHOD_LABELS: Record<string, string> = { mtn_momo: "MTN MoMo", orange_money: "Orange Money" };

/** Where a creator's payment stands, in the creator's words. */
export function creatorPaymentInfo(payment: CreatorPayment): StatusInfo {
  if (payment.dispute?.status === "open") return { label: "Disputed", note: "The brand disputed this delivery. The payment stays in escrow while it is reviewed.", tone: "warning" };
  if (payment.dispute?.awaitingPolicyDecision) return { label: "Dispute upheld", note: "The dispute was upheld. The payment stays in escrow and nothing has been released or returned yet.", tone: "warning" };
  switch (payment.status) {
    case "held":
      return { label: "On hold", note: "The brand has paid into escrow. Deliver the work, then submit your delivery report.", tone: "info" };
    case "requested":
      return { label: "Awaiting release", note: payment.delivery.releaseEligible ? "Your report was received. Our finance team can now release this payment." : "Your report was received. Release happens after the brand acknowledges delivery or the dispute period ends.", tone: "warning" };
    case "released":
      return { label: "Released", note: payment.simulated ? "Released to a simulated balance. This is test money and can't be withdrawn." : "Released to your balance.", tone: "success" };
    case "refund_pending":
      return { label: "Refund pending", note: "A refund of this payment is in progress.", tone: "warning" };
    case "refunded":
      return { label: "Refunded", note: "This payment was refunded.", tone: "neutral" };
    default:
      return { label: "Unknown", note: "We don't recognise this status. Reload the page.", tone: "neutral" };
  }
}

/** The brand's view of the delivery step. */
export function brandDeliveryNote(payment: BrandPayment): string | null {
  if (payment.dispute?.status === "open") return "You disputed this delivery. The payment stays in escrow while it is reviewed.";
  if (payment.dispute?.awaitingPolicyDecision) return "Your dispute was upheld. The payment stays in escrow; nothing has been returned yet.";
  if (payment.status === "requested" && payment.delivery.acknowledgedAt) return "You acknowledged this delivery.";
  if (payment.status === "requested") return payment.delivery.disputeWindowOpen ? "The creator reported delivery. Acknowledge it, or dispute it before the deadline." : "The creator reported delivery. The period to dispute has ended.";
  return null;
}

export const TONE_CLASS: Record<StatusInfo["tone"], string> = {
  info: "bg-info-light text-info",
  warning: "bg-warning-light text-warning",
  success: "bg-success-light text-success-strong",
  neutral: "bg-border-light text-body",
  danger: "bg-danger-light text-danger",
};
