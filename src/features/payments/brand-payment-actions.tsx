"use client";

import { DecisionPanel } from "@/features/admin/decision-panel";
import type { DecisionAction } from "@/features/admin/decision-panel";
import type { BrandPayment, RefundRequest } from "@/lib/api/schemas";
import { decideDeliveryAction, requestRefundReviewAction, withdrawRefundReviewAction } from "./actions";
import { LIMITS } from "./schemas";

const RETURN_TO = "/brand/payments";

/** The buttons the API's own hints allow for one delivery. The API re-checks each action; a brand never releases or refunds money. */
export function DeliveryActions({ payment }: { payment: BrandPayment }) {
  const actions: DecisionAction[] = [];
  if (payment.actions.canAcknowledge)
    actions.push({ kind: "acknowledge", label: "Acknowledge delivery", tone: "primary", text: "none", confirm: "Acknowledge this delivery? You won't be able to dispute it afterwards.", done: "Delivery acknowledged." });
  if (payment.actions.canDispute)
    actions.push({ kind: "dispute", label: "Dispute delivery", tone: "danger", text: "required", textLabel: "Why do you dispute it?", min: LIMITS.disputeReason.min, max: LIMITS.disputeReason.max, done: "Dispute opened. The payment stays in escrow." });
  if (payment.actions.canWithdrawDispute)
    actions.push({ kind: "withdraw_dispute", label: "Withdraw dispute", tone: "neutral", text: "none", confirm: "Withdraw your dispute?", done: "Dispute withdrawn." });
  if (payment.status === "held")
    actions.push({ kind: "refund", label: "Request refund review", tone: "neutral", text: "required", textLabel: "Why are you asking for a refund review?", textHelp: "This asks our team to look. It is not a refund and no money is returned by it.", min: LIMITS.refundReason.min, max: LIMITS.refundReason.max, done: "Refund review requested. No refund has been made." });
  if (actions.length === 0) return null;
  return (
    <DecisionPanel
      actions={actions}
      returnTo={RETURN_TO}
      emptyText=""
      submit={(kind, text) => (kind === "refund" ? requestRefundReviewAction({ id: payment.id, reason: text }) : decideDeliveryAction({ id: payment.id, kind, ...(text ? { reason: text } : {}) }))}
    />
  );
}

export function RefundRequestActions({ request }: { request: RefundRequest }) {
  if (!request.canWithdraw) return null;
  return (
    <DecisionPanel
      actions={[{ kind: "withdraw", label: "Withdraw request", tone: "neutral", text: "none", confirm: "Withdraw this refund review request?", done: "Request withdrawn." }]}
      returnTo={RETURN_TO}
      emptyText=""
      submit={() => withdrawRefundReviewAction({ id: request.id })}
    />
  );
}
