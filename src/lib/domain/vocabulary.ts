/**
 * The ONE source of the API's enumerated values in this app. Every list below is copied from the Express backend's contracts
 * (database enum types and the zod request/response schemas; see the backend repository's docs/FRONTEND_VOCABULARY_MAPPING.md) and is
 * kept honest by tests/unit/domain-contract.test.ts, which compares them with the backend migrations when the backend repository is present.
 *
 * Rules: values here are canonical API codes. Display text lives in labels.ts, and legacy or UI-only spellings are translated at the
 * edges by mappers.ts. Nothing here is invented by the frontend: a concept the API does not have is declared in frontend-only.ts.
 */

function define<const T extends readonly string[]>(values: T) {
  const set: ReadonlySet<string> = new Set(values);
  return { values, is: (candidate: unknown): candidate is T[number] => typeof candidate === "string" && set.has(candidate) };
}

// ---- identity -------------------------------------------------------------------------------------------------------------------
export const ROLE = define(["brand", "creator", "admin"] as const);
export type Role = (typeof ROLE.values)[number];

/** Roles a person can register as or be listed as in the user directory (administrators are managed separately). */
export const ACCOUNT_TYPE = define(["brand", "creator"] as const);
export type AccountType = (typeof ACCOUNT_TYPE.values)[number];

export const ACCOUNT_STATUS = define(["pending", "active", "suspended", "rejected"] as const);
export type AccountStatus = (typeof ACCOUNT_STATUS.values)[number];

export const APPLICATION_STATUS = define(["draft", "under_review", "approved", "rejected"] as const);
export type ApplicationStatus = (typeof APPLICATION_STATUS.values)[number];

export const ADMIN_ROLE = define(["super_admin", "campaign_manager", "finance", "support_agent"] as const);
export type AdminRoleCode = (typeof ADMIN_ROLE.values)[number];

export const PERMISSION = define([
  "dashboard.view",
  "dashboard.export",
  "users.view",
  "users.moderate",
  "applications.review",
  "profiles.verify",
  "campaigns.review",
  "payments.view",
  "payments.release",
  "payments.refund",
  "disputes.uphold",
  "withdrawals.review",
  "reconciliation.resolve",
  "tickets.manage",
  "moderation.manage",
  "alerts.manage",
  "team.manage",
  "audit.view",
  "settings.manage",
] as const);
export type PermissionCode = (typeof PERMISSION.values)[number];

// ---- campaigns, offers, hiring ----------------------------------------------------------------------------------------------------
export const CAMPAIGN_STATUS = define(["draft", "pending_review", "open", "accepted", "in_progress", "completed", "rejected", "cancelled"] as const);
export type CampaignStatus = (typeof CAMPAIGN_STATUS.values)[number];

export const OFFER_STATUS = define(["pending", "accepted", "declined", "withdrawn", "cancelled", "expired", "funding_expired", "refunded"] as const);
export type OfferStatus = (typeof OFFER_STATUS.values)[number];

export const OFFER_ORIGIN = define(["direct_hire", "campaign_match"] as const);
export type OfferOrigin = (typeof OFFER_ORIGIN.values)[number];

export const OFFER_INITIATOR = define(["platform", "brand", "creator"] as const);
export type OfferInitiator = (typeof OFFER_INITIATOR.values)[number];

// ---- money ------------------------------------------------------------------------------------------------------------------------
export const PAYMENT_STATUS = define(["held", "requested", "released", "refund_pending", "refunded"] as const);
export type PaymentStatus = (typeof PAYMENT_STATUS.values)[number];

/** What the API reports for a dispute (database values, unchanged). */
export const DISPUTE_STATUS = define(["open", "withdrawn", "resolved_in_favour", "resolved_against"] as const);
export type DisputeStatus = (typeof DISPUTE_STATUS.values)[number];

export const REFUND_STATUS = define(["pending", "completed", "cancelled"] as const);
export type RefundStatus = (typeof REFUND_STATUS.values)[number];

export const REFUND_REQUEST_STATUS = define(["requested", "accepted", "rejected", "withdrawn"] as const);
export type RefundRequestStatus = (typeof REFUND_REQUEST_STATUS.values)[number];

export const WITHDRAWAL_STATUS = define(["requested", "under_review", "approved", "rejected", "cancelled", "processing", "completed", "failed"] as const);
export type WithdrawalStatus = (typeof WITHDRAWAL_STATUS.values)[number];

export const PAYMENT_METHOD = define(["mtn_momo", "orange_money"] as const);
export type PaymentMethodCode = (typeof PAYMENT_METHOD.values)[number];

// ---- creators and campaign form values ----------------------------------------------------------------------------------------
export const PLATFORM = define(["facebook", "instagram", "tiktok", "youtube"] as const);
export type PlatformCode = (typeof PLATFORM.values)[number];

export const LANGUAGE = define(["english", "french", "bilingual"] as const);
export type LanguageCode = (typeof LANGUAGE.values)[number];

/** NOTE: the API accepts this value but the full-amount escrow rule is the approved payment policy; the 50% wording is informational only (decision O-5). */
export const DEPOSIT_TERMS = define(["deposit_50_balance_on_delivery", "full_in_escrow"] as const);
export type DepositTerms = (typeof DEPOSIT_TERMS.values)[number];

export const AGE_RANGE = define(["18-24", "25-34", "35-44", "45-plus"] as const);
export type AgeRangeCode = (typeof AGE_RANGE.values)[number];

/** Campaign minimum engagement: the API stores a percentage (3, 5 or 7) or null for "no minimum". */
export const MIN_ENGAGEMENT_PCT = [3, 5, 7] as const;
export type MinEngagementPct = (typeof MIN_ENGAGEMENT_PCT)[number];

export const HIRE_DURATION = define(["1-week", "2-weeks", "1-month", "2-months", "3-months-plus"] as const);
export type HireDurationCode = (typeof HIRE_DURATION.values)[number];

// ---- operations -------------------------------------------------------------------------------------------------------------------
export const TICKET_STATUS = define(["open", "in_progress", "resolved"] as const);
export type TicketStatus = (typeof TICKET_STATUS.values)[number];

export const TICKET_PRIORITY = define(["urgent", "normal", "low"] as const);
export type TicketPriority = (typeof TICKET_PRIORITY.values)[number];

export const DOCUMENT_KIND = define(["contract", "tax_id", "business_registration", "national_id"] as const);
export type DocumentKind = (typeof DOCUMENT_KIND.values)[number];

export const DOCUMENT_STATUS = define(["verified", "in_review", "rejected"] as const);
export type DocumentStatus = (typeof DOCUMENT_STATUS.values)[number];

export const ALERT_KIND = define(["failed_logins", "follower_spike", "payout_change"] as const);
export type AlertKind = (typeof ALERT_KIND.values)[number];

export const ALERT_SEVERITY = define(["high", "medium"] as const);
export type AlertSeverity = (typeof ALERT_SEVERITY.values)[number];

export const FLAG_FIELD = define(["bio", "campaign_description", "media"] as const);
export type FlagField = (typeof FLAG_FIELD.values)[number];

export const FLAG_RESOLUTION = define(["removed", "dismissed"] as const);
export type FlagResolution = (typeof FLAG_RESOLUTION.values)[number];

// ---- notifications --------------------------------------------------------------------------------------------------------------
/** Every `notification_type` the backend can write (an in-app notification's kind). A value this list does not know is shown neutrally, never as an error. */
export const NOTIFICATION_TYPE = define([
  "account_approved", "account_rejected", "account_suspended", "account_reactivated",
  "admin_message", "content_removed",
  "campaign_approved", "campaign_rejected", "campaign_cancelled",
  "offer_received", "offer_accepted", "offer_declined", "offer_withdrawn", "offer_cancelled", "offer_expired",
  "payment_held", "payment_failed", "funding_expired",
  "delivery_report_submitted", "delivery_acknowledged",
  "dispute_opened", "dispute_withdrawn", "dispute_resolved", "dispute_upheld",
  "payment_released",
  "refund_request_decided", "refund_pending", "refund_completed", "refund_cancelled",
  "withdrawal_requested", "withdrawal_under_review", "withdrawal_approved", "withdrawal_rejected", "withdrawal_cancelled", "withdrawal_completed", "withdrawal_failed",
] as const);
export type NotificationType = (typeof NOTIFICATION_TYPE.values)[number];
