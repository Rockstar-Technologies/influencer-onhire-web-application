import type {
  AccountStatus,
  AccountType,
  AdminRoleCode,
  AgeRangeCode,
  AlertKind,
  ApplicationStatus,
  CampaignStatus,
  DepositTerms,
  DisputeStatus,
  DocumentKind,
  DocumentStatus,
  FlagField,
  LanguageCode,
  OfferStatus,
  PaymentMethodCode,
  PaymentStatus,
  RefundRequestStatus,
  RefundStatus,
  TicketPriority,
  TicketStatus,
  WithdrawalStatus,
} from "./vocabulary";

/**
 * Display text for canonical API codes. Labels are presentation only: nothing here is ever sent to the API, and the API's codes are
 * never shown to people directly. Screens may keep their own wording (for example brand versus creator phrasing of a payment status);
 * they must key it by the canonical code and use `labelOf` so that an unexpected value from the API shows a neutral label instead of crashing.
 */
export const UNKNOWN_LABEL = "Unknown";

export function labelOf<K extends string>(labels: Readonly<Record<K, string>>, value: unknown, fallback: string = UNKNOWN_LABEL): string {
  return typeof value === "string" && Object.hasOwn(labels, value) ? labels[value as K] : fallback;
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = { brand: "Brand", creator: "Creator" };
export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = { pending: "Pending", active: "Active", suspended: "Suspended", rejected: "Rejected" };
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = { draft: "Draft", under_review: "Under review", approved: "Approved", rejected: "Rejected" };
export const ADMIN_ROLE_LABELS: Record<AdminRoleCode, string> = { super_admin: "Super Admin", campaign_manager: "Campaign Manager", finance: "Finance", support_agent: "Support Agent" };

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  open: "Open",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
  expired: "Expired",
  funding_expired: "Funding expired",
  refunded: "Refunded",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  held: "On hold (escrow)",
  requested: "Payout requested",
  released: "Released",
  refund_pending: "Refund pending",
  refunded: "Refunded",
};

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = { open: "Open", withdrawn: "Withdrawn", resolved_in_favour: "Resolved in favour", resolved_against: "Resolved against" };
export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = { pending: "Pending", completed: "Completed", cancelled: "Cancelled" };
export const REFUND_REQUEST_STATUS_LABELS: Record<RefundRequestStatus, string> = { requested: "Requested", accepted: "Accepted", rejected: "Rejected", withdrawn: "Withdrawn" };

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  requested: "Requested",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodCode, string> = { mtn_momo: "MTN MoMo", orange_money: "Orange Money" };
export const LANGUAGE_LABELS: Record<LanguageCode, string> = { english: "English", french: "French", bilingual: "Bilingual" };
export const AGE_RANGE_LABELS: Record<AgeRangeCode, string> = { "18-24": "18–24", "25-34": "25–34", "35-44": "35–44", "45-plus": "45+" };

/** Informational wording only (decision O-5): it does not describe how funding works. Funding is 100% escrow. */
export const DEPOSIT_TERMS_LABELS: Record<DepositTerms, string> = {
  deposit_50_balance_on_delivery: "50% deposit, balance on delivery",
  full_in_escrow: "Full amount held in escrow until delivery",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = { open: "Open", in_progress: "In progress", resolved: "Resolved" };
export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = { urgent: "Urgent", normal: "Normal", low: "Low" };
export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = { contract: "Contract", tax_id: "Tax ID", business_registration: "Business registration", national_id: "National ID" };
export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = { verified: "Verified", in_review: "In review", rejected: "Rejected" };
export const ALERT_KIND_LABELS: Record<AlertKind, string> = { failed_logins: "Failed logins", follower_spike: "Follower spike", payout_change: "Payout account change" };
export const FLAG_FIELD_LABELS: Record<FlagField, string> = { bio: "Bio", campaign_description: "Campaign description", media: "Media" };

/** Safe lookup for any per-status table (labels, badge styles, notes): an unexpected value from the API yields the fallback instead of undefined. */
export function lookupOr<K extends string, V>(table: Readonly<Record<K, V>>, key: unknown, fallback: V): V {
  return typeof key === "string" && Object.hasOwn(table, key) ? table[key as K] : fallback;
}
