"use client";

import { useState } from "react";
import { actOnIssueAction, cancelRefundAction, createRefundAction, decideRefundRequestAction, decideWithdrawalAction, dismissDisputeAction, upholdDisputeAction } from "./finance-actions";
import { DecisionPanel } from "./decision-panel";
import type { DecisionAction } from "./decision-panel";
import { FINANCE_LIMITS, newRefundKey } from "./finance-schemas";

/**
 * The buttons for finance decisions. Which buttons exist follows the API's own hints for this administrator and record; the API re-checks every decision
 * (permission, state, the two-administrator rule) and nothing is reported as done until it confirms. No text promises money moved: the API records decisions.
 */

export interface OutcomeState {
  status: string;
  proposedBy: string | null;
}

export function DisputeDecision({ paymentId, me, mayDismiss, mayUphold, canResolve, canPropose, awaitingSecond, outcome }: { paymentId: string; me: string; mayDismiss: boolean; mayUphold: boolean; canResolve: boolean; canPropose: boolean; awaitingSecond: boolean; outcome: OutcomeState | null }) {
  const actions: DecisionAction[] = [];
  const pending = awaitingSecond && outcome?.status === "proposed";
  const mine = pending && outcome?.proposedBy === me;
  if (mayDismiss && canResolve && !pending)
    actions.push({ kind: "dismiss", label: "Dismiss dispute", tone: "primary", text: "required", textLabel: "Note for the record", textHelp: "Both parties are told the dispute was dismissed. The payment can then be released by Finance.", min: FINANCE_LIMITS.disputeNote.min, max: FINANCE_LIMITS.disputeNote.max, confirm: "Dismiss this dispute? It becomes final and the payment becomes releasable.", done: "The dispute was dismissed. The payment can now be released." });
  if (mayUphold && canPropose)
    actions.push({ kind: "propose", label: "Propose to uphold", tone: "danger", text: "required", textLabel: "Why should the dispute be upheld?", textHelp: "Upholding needs a second, different administrator to confirm. It returns no money: the payment stays in escrow.", min: FINANCE_LIMITS.disputeNote.min, max: FINANCE_LIMITS.disputeNote.max, confirm: "Propose upholding this dispute? Another administrator must confirm it. No money is returned.", done: "Proposal recorded. Another administrator must now confirm or decline it." });
  if (mayUphold && pending && !mine) {
    actions.push({ kind: "confirm", label: "Confirm upholding", tone: "danger", text: "required", textLabel: "Note for the record", min: FINANCE_LIMITS.disputeNote.min, max: FINANCE_LIMITS.disputeNote.max, confirm: "Confirm upholding this dispute? It becomes final. The payment stays in escrow and no money is returned.", done: "The dispute was upheld by two administrators. The payment stays in escrow; no money has been returned." });
    actions.push({ kind: "decline", label: "Decline proposal", tone: "neutral", text: "required", textLabel: "Why are you declining?", min: FINANCE_LIMITS.disputeNote.min, max: FINANCE_LIMITS.disputeNote.max, done: "The proposal was declined. The dispute stays open." });
  }
  if (mayUphold && mine) actions.push({ kind: "withdraw", label: "Withdraw my proposal", tone: "neutral", text: "none", confirm: "Withdraw your proposal? The dispute stays open.", done: "Your proposal was withdrawn. The dispute stays open." });
  const empty = pending && mine ? "You proposed upholding this dispute. A different administrator must confirm or decline it." : pending ? "A proposal is waiting for a second administrator." : "No dispute decision is available to you for this payment.";
  return (
    <div className="space-y-3">
      {pending && <p className="text-sm font-medium text-heading">{mine ? "You proposed upholding this dispute. A different administrator must confirm or decline it." : "Another administrator proposed upholding this dispute. You may confirm or decline it."}</p>}
      <DecisionPanel
      actions={actions}
      returnTo={`/admin/payments/${paymentId}`}
      emptyText={empty}
      submit={(kind, note) => (kind === "dismiss" ? dismissDisputeAction({ id: paymentId, note }) : upholdDisputeAction({ id: paymentId, kind, ...(note ? { note } : {}) }))}
      />
    </div>
  );
}

export function RefundRequestDecision({ id, canDecide }: { id: string; canDecide: boolean }) {
  const actions: DecisionAction[] = canDecide
    ? [
        { kind: "accept", label: "Accept request", tone: "primary", text: "required", textLabel: "Note for the record", textHelp: "Accepting records your decision only. It does not create or complete a refund, and the brand is told no refund has been made.", min: FINANCE_LIMITS.requestNote.min, max: FINANCE_LIMITS.requestNote.max, confirm: "Accept this refund review request? No refund is created by this.", done: "The request was accepted. No refund has been created: use the payment's refund action if one should be recorded." },
        { kind: "reject", label: "Reject request", tone: "danger", text: "required", textLabel: "Reason", min: FINANCE_LIMITS.requestNote.min, max: FINANCE_LIMITS.requestNote.max, confirm: "Reject this refund review request? This is final.", done: "The request was rejected." },
      ]
    : [];
  return <DecisionPanel actions={actions} returnTo={`/admin/refund-requests/${id}`} emptyText="This request is not waiting for a decision." submit={(kind, note) => decideRefundRequestAction({ id, kind, note })} />;
}

/** Records a full refund of a held payment. The idempotency key lives as long as this panel, so a retry after an unclear answer cannot record a second refund. */
export function RefundCreate({ paymentId, canRefund, simulated }: { paymentId: string; canRefund: boolean; simulated: boolean }) {
  const [key] = useState(() => newRefundKey());
  const actions: DecisionAction[] = canRefund
    ? [{ kind: "refund", label: "Record full refund", tone: "danger", text: "required", textLabel: "Reason", textHelp: simulated ? "This payment is simulated: the refund is bookkeeping and no real money moves." : "No provider refund exists: this records the decision only and no money is returned.", min: FINANCE_LIMITS.refundReason.min, max: FINANCE_LIMITS.refundReason.max, confirm: simulated ? "Record a full refund of this simulated payment? No real money is involved." : "Record a full refund decision for this payment? No money is returned: no provider refund exists.", done: simulated ? "The simulated refund was recorded. No real money moved." : "The refund decision was recorded. No money has been returned." }]
    : [];
  return <DecisionPanel actions={actions} returnTo={`/admin/payments/${paymentId}`} emptyText="A refund can't be recorded for this payment in its current state." submit={(_kind, reason) => createRefundAction({ paymentId, key, reason })} />;
}

export function RefundCancel({ id, canCancel }: { id: string; canCancel: boolean }) {
  const actions: DecisionAction[] = canCancel
    ? [{ kind: "cancel", label: "Cancel refund", tone: "danger", text: "required", textLabel: "Reason", min: FINANCE_LIMITS.refundNote.min, max: FINANCE_LIMITS.refundNote.max, confirm: "Cancel this pending refund? The payment returns to escrow.", done: "The refund was cancelled." }]
    : [];
  return <DecisionPanel actions={actions} returnTo={`/admin/refunds/${id}`} emptyText="This refund can't be cancelled." submit={(_kind, note) => cancelRefundAction({ id, note })} />;
}

export function WithdrawalDecision({ id, canApprove, canReject }: { id: string; canApprove: boolean; canReject: boolean }) {
  const actions: DecisionAction[] = [];
  if (canApprove)
    actions.push({ kind: "approve", label: "Approve for payout", tone: "primary", text: "optional", textLabel: "Internal note", textHelp: "Approving only clears the request for a future payout. No payout provider is connected: nothing is paid.", min: FINANCE_LIMITS.withdrawalNote.min, max: FINANCE_LIMITS.withdrawalNote.max, confirm: "Approve this withdrawal request? It is only cleared for a future payout; nothing is paid.", done: "The request was approved for a future payout. Nothing has been paid." });
  if (canReject)
    actions.push({ kind: "reject", label: "Reject request", tone: "danger", text: "required", textLabel: "Reason", textHelp: "The reserved amount returns to the creator's balance.", min: FINANCE_LIMITS.withdrawalNote.min, max: FINANCE_LIMITS.withdrawalNote.max, confirm: "Reject this withdrawal request? The reserved amount returns to the creator's balance.", done: "The request was rejected and the reserved amount was returned to the creator's balance." });
  return <DecisionPanel actions={actions} returnTo={`/admin/withdrawals/${id}`} emptyText="This withdrawal can't be decided in its current state." submit={(kind, note) => decideWithdrawalAction({ id, kind, ...(note ? { note } : {}) })} />;
}

export function IssueDecision({ id, canResolve, canDismiss }: { id: string; canResolve: boolean; canDismiss: boolean }) {
  const actions: DecisionAction[] = [];
  if (canResolve) actions.push({ kind: "resolve", label: "Resolve with a note", tone: "primary", text: "required", textLabel: "What was checked and decided?", textHelp: "An audited note only. It does not change any payment.", min: FINANCE_LIMITS.issueNote.min, max: FINANCE_LIMITS.issueNote.max, confirm: "Mark this issue resolved? This is final and changes no payment.", done: "The issue was resolved. No payment was changed." });
  if (canDismiss) actions.push({ kind: "dismiss", label: "Dismiss as noise", tone: "neutral", text: "required", textLabel: "Why is this noise?", min: FINANCE_LIMITS.issueNote.min, max: FINANCE_LIMITS.issueNote.max, confirm: "Dismiss this issue? This is final and changes no payment.", done: "The issue was dismissed. No payment was changed." });
  return <DecisionPanel actions={actions} returnTo={`/admin/reconciliation/${id}`} emptyText="This issue can't be resolved or dismissed now (it may already be closed, or its collection is still unresolved at the provider)." submit={(kind, note) => actOnIssueAction({ id, kind, note })} />;
}
