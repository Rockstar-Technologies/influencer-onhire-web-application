/**
 * Concepts the frontend shows that the API does NOT define. They are declared here, apart from vocabulary.ts, so nobody mistakes them
 * for API values, and so an API-backed screen can never receive one by accident. Each entry says why it is unresolved.
 */

/** A creator or brand that has not uploaded a compliance document at all. The API has document statuses (verified, in_review, rejected) but no "missing" row. */
export type ComplianceDisplayStatus = "verified" | "in_review" | "rejected" | "missing";

/**
 * Campaign states the admin dashboard derives for display. "scheduled" and "overdue" are NOT API statuses: how they are computed from the API's
 * statuses and dates has not been defined by the business, so they stay UI-only until it is.
 */
export type CampaignDisplayStatus = "draft" | "scheduled" | "in_progress" | "pending_review" | "completed" | "overdue";

/** Ledger-style rows shown on the admin user profile. The API's ledger entry types are payment_release, withdrawal_debit and withdrawal_reversal; there is no "deposit" (no prepaid wallet exists) and the mapping of the rest is unresolved. */
export type WalletTransactionKind = "escrow-held" | "released" | "refunded" | "withdrawal" | "deposit";

/** A payment method some mock creators list besides mobile money. The API only supports mtn_momo and orange_money, so this is display-only. */
export const FRONTEND_ONLY_PAYMENT_METHODS = ["Bank transfer"] as const;
