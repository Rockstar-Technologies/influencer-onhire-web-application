import { StatusBadge, type BadgeStyle } from "@/components/shared/status-badge";
import { OFFER_STATUS_LABELS, lookupOr } from "@/lib/domain/labels";
import type { OfferStatus } from "@/lib/domain/vocabulary";
import type { OfferKind } from "./mapping";

const STYLES: Record<OfferStatus, Omit<BadgeStyle, "label">> = {
  pending: { badge: "bg-warning-light text-warning", dot: "bg-warning" },
  accepted: { badge: "bg-success-light text-success-strong", dot: "bg-success" },
  declined: { badge: "bg-border-light text-body", dot: "bg-muted" },
  withdrawn: { badge: "bg-border-light text-body", dot: "bg-muted" },
  cancelled: { badge: "bg-border-light text-body", dot: "bg-muted" },
  expired: { badge: "bg-border-light text-body", dot: "bg-muted" },
  funding_expired: { badge: "bg-danger-light text-danger-strong", dot: "bg-danger" },
  refunded: { badge: "bg-info-light text-info", dot: "bg-info" },
};
const UNKNOWN: BadgeStyle = { label: "Unknown", badge: "bg-border-light text-body", dot: "bg-muted" };

/** The real offer status with its canonical label; every API status has its own entry and an unexpected value shows "Unknown". */
export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  const style = lookupOr(STYLES, status, null);
  return <StatusBadge {...(style ? { ...style, label: lookupOr(OFFER_STATUS_LABELS, status, "Unknown") } : UNKNOWN)} />;
}

export const OFFER_KIND_LABELS: Record<OfferKind, string> = {
  direct_hire: "Direct hire",
  invitation: "Platform invitation",
  application: "Your application",
};

/** Label for a brand looking at its own side of an offer. */
export const BRAND_OFFER_KIND_LABELS: Record<OfferKind, string> = {
  direct_hire: "Direct hire",
  invitation: "Platform invitation",
  application: "Creator application",
};
