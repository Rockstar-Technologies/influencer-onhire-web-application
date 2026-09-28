import { StatusBadge as Badge, type BadgeStyle } from "@/components/shared/status-badge";
import type { TicketPriority, TicketStatus } from "@/types/support";

const PRIORITY_STYLES: Record<TicketPriority, BadgeStyle> = {
  urgent: { label: "Urgent", badge: "bg-danger-light text-danger-strong", dot: "bg-danger" },
  normal: { label: "Normal", badge: "bg-info-light text-info", dot: "bg-info" },
  low: { label: "Low", badge: "bg-border-light text-body", dot: "bg-muted" },
};

const STATUS_STYLES: Record<TicketStatus, BadgeStyle> = {
  open: { label: "Open", badge: "bg-warning-light text-warning", dot: "bg-warning" },
  "in-progress": { label: "In Progress", badge: "bg-primary-light text-primary", dot: "bg-primary" },
  resolved: { label: "Resolved", badge: "bg-success-light text-success-strong", dot: "bg-success" },
};

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge {...PRIORITY_STYLES[priority]} />;
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge {...STATUS_STYLES[status]} />;
}
