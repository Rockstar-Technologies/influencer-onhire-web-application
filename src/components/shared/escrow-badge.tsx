import { StatusBadge, type BadgeStyle } from "@/components/shared/status-badge";
import { lookupOr } from "@/lib/domain/labels";
import type { EscrowStatus } from "@/types/payments";

// Blue = money still held, amber = waiting on an admin, green = paid out.
const ESCROW_STYLES: Record<EscrowStatus, BadgeStyle> = {
  held: { label: "On hold (escrow)", badge: "bg-info-light text-info", dot: "bg-info" },
  requested: { label: "Payout requested", badge: "bg-warning-light text-warning", dot: "bg-warning" },
  released: { label: "Released", badge: "bg-success-light text-success-strong", dot: "bg-success" },
  refund_pending: { label: "Refund pending", badge: "bg-warning-light text-warning", dot: "bg-warning" },
  refunded: { label: "Refunded", badge: "bg-border-light text-body", dot: "bg-muted" },
};

const UNKNOWN_STYLE: BadgeStyle = { label: "Unknown", badge: "bg-border-light text-body", dot: "bg-muted" };

export function EscrowBadge({ status }: { status: EscrowStatus }) {
  return <StatusBadge {...lookupOr(ESCROW_STYLES, status, UNKNOWN_STYLE)} />;
}
