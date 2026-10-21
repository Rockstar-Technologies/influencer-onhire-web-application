"use client";

import { decideApplicationAction, decideCampaignAction, moderateUserAction, releasePaymentAction } from "./actions";
import { DecisionPanel } from "./decision-panel";
import type { DecisionAction } from "./decision-panel";
import { LIMITS } from "./schemas";
import { USER_ACTION_TEXT } from "./mapping";
import type { UserAction } from "./mapping";

/** Account moderation buttons for the actions the account's state allows. The person is notified in the app by the API (fixed text); the reason stays internal. */
export function UserModeration({ id, available }: { id: string; available: UserAction[] }) {
  const actions: DecisionAction[] = available.map((kind) => ({
    kind,
    label: USER_ACTION_TEXT[kind].label,
    tone: kind === "reactivate" ? "primary" : "danger",
    text: "optional",
    textLabel: "Reason (kept in the audit trail; not sent to the person)",
    min: LIMITS.userReason.min,
    max: LIMITS.userReason.max,
    singleLine: true,
    confirm: USER_ACTION_TEXT[kind].confirm,
    done: USER_ACTION_TEXT[kind].done,
  }));
  return <DecisionPanel actions={actions} returnTo={`/admin/users/${id}`} emptyText="No account action is available for this account." submit={(kind, reason) => moderateUserAction({ id, kind, ...(reason ? { reason } : {}) })} />;
}

export function ApplicationDecision({ id, canDecide }: { id: string; canDecide: boolean }) {
  const actions: DecisionAction[] = canDecide
    ? [
        { kind: "approve", label: "Approve", tone: "primary", text: "optional", textLabel: "Internal note", textHelp: "Never shown to the creator.", min: LIMITS.note.min, max: LIMITS.note.max, confirm: "Approve this application? The creator's account becomes active, a live profile is created and they are signed out so they sign in again.", done: "The application was approved: the creator's account is active and a live profile was created." },
        { kind: "reject", label: "Reject", tone: "danger", text: "required", textLabel: "Reason for the applicant", textHelp: "The applicant reads this as feedback, so write it for them.", min: LIMITS.rejectReason.min, max: LIMITS.rejectReason.max, confirm: "Reject this application? The creator can read your reason and apply again.", done: "The application was rejected. The applicant can read your reason and apply again." },
      ]
    : [];
  return <DecisionPanel actions={actions} returnTo={`/admin/applications/${id}`} emptyText="This application is not waiting for a decision." submit={(kind, text) => decideApplicationAction({ id, kind, ...(text ? { text } : {}) })} />;
}

export function CampaignDecision({ id, canDecide }: { id: string; canDecide: boolean }) {
  const actions: DecisionAction[] = canDecide
    ? [
        { kind: "approve", label: "Approve and open", tone: "primary", text: "optional", textLabel: "Internal note", textHelp: "Not shown to the brand.", min: LIMITS.note.min, max: LIMITS.note.max, confirm: "Approve this campaign? It opens to creators and matching invitations are sent.", done: "The campaign was approved and is open." },
        { kind: "reject", label: "Reject", tone: "danger", text: "required", textLabel: "Reason for the brand", textHelp: "The brand reads this note on its campaign, so write it for them.", min: LIMITS.rejectReason.min, max: LIMITS.rejectReason.max, confirm: "Reject this campaign? The brand can read your reason; a rejected campaign is final.", done: "The campaign was rejected. The brand can read your reason." },
      ]
    : [];
  return <DecisionPanel actions={actions} returnTo={`/admin/campaigns/${id}`} emptyText="This campaign is not waiting for a decision." submit={(kind, text) => decideCampaignAction({ id, kind, ...(text ? { text } : {}) })} />;
}

export function PaymentRelease({ id, canRelease, eligibleNote }: { id: string; canRelease: boolean; eligibleNote: string }) {
  const actions: DecisionAction[] = canRelease
    ? [{ kind: "release", label: "Release payment", tone: "primary", text: "none", confirm: "Release this payment? The creator's net amount is credited to their wallet. This cannot be undone.", done: "The payment was released and the creator's wallet was credited." }]
    : [];
  return <DecisionPanel actions={actions} returnTo={`/admin/payments/${id}`} emptyText={eligibleNote} submit={() => releasePaymentAction({ id })} />;
}
