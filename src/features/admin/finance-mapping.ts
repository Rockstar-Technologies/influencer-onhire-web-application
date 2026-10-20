/** Plain words for what the finance API reports. A value this app doesn't know is shown as "Unknown", never guessed. */
export const REFUND_REQUEST_TEXT: Record<string, string> = { requested: "Awaiting decision", accepted: "Accepted", rejected: "Rejected", withdrawn: "Withdrawn by the brand" };
export const FOLLOW_UP_TEXT: Record<string, string> = {
  awaiting_refund: "Accepted; no refund recorded yet",
  refund_pending: "A refund was recorded and has not completed",
  refund_completed: "A simulated refund was recorded as completed",
  not_refundable: "No longer refundable",
};
export const REFUND_TEXT: Record<string, string> = { pending: "Pending", completed: "Completed (simulated)", cancelled: "Cancelled" };
export const WITHDRAWAL_TEXT: Record<string, string> = {
  requested: "Requested",
  under_review: "Under review",
  approved: "Approved (not paid)",
  rejected: "Rejected",
  cancelled: "Cancelled by the creator",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};
export const WITHDRAWAL_TONE = { requested: "wait", under_review: "warn", approved: "wait", rejected: "bad", cancelled: "neutral", processing: "warn", completed: "good", failed: "bad" } as const;
export const REFUND_REQUEST_TONE = { requested: "warn", accepted: "good", rejected: "bad", withdrawn: "neutral" } as const;
export const REFUND_TONE = { pending: "warn", completed: "good", cancelled: "neutral" } as const;
export const DISPUTE_TEXT: Record<string, string> = { open: "Open", withdrawn: "Withdrawn by the brand", resolved_in_favour: "Upheld (payment stays in escrow)", resolved_against: "Dismissed" };

export const METHOD_TEXT: Record<string, string> = { mtn_momo: "MTN MoMo", orange_money: "Orange Money" };

/** "lookup_not_found" → "Lookup not found": the API's kinds are shown readably without being renamed or invented. */
export const humanize = (value: string): string => {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export function ageText(seconds: number): string {
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min`;
  if (seconds < 172800) return `${Math.round(seconds / 3600)} h`;
  return `${Math.round(seconds / 86400)} days`;
}
