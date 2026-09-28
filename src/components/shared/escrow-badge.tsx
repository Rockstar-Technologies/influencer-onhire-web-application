import { StatusBadge, type BadgeStyle } from "@/components/shared/status-badge";
import type { EscrowStatus } from "@/types/payments";

// Blue = money still held, amber = waiting on an admin, green = paid out.
const ESCROW_STYLES: Record<EscrowStatus, BadgeStyle> = {
  held: { label: "On hold (escrow)", badge: "bg-info-light text-info", dot: "bg-info" },
  requested: { label: "Payout requested", badge: "bg-warning-light text-warning", dot: "bg-warning" },
  released: { label: "Released", badge: "bg-success-light text-success-strong", dot: "bg-success" },
};

export function EscrowBadge({ status }: { status: EscrowStatus }) {
  return <StatusBadge {...ESCROW_STYLES[status]} />;
}
