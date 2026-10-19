import { StatusBadge, type BadgeStyle } from "@/components/shared/status-badge";
import { CAMPAIGN_STATUS_LABELS, lookupOr } from "@/lib/domain/labels";
import type { CampaignStatus } from "@/lib/domain/vocabulary";

const STYLES: Record<CampaignStatus, Omit<BadgeStyle, "label">> = {
  draft: { badge: "bg-border-light text-body", dot: "bg-muted" },
  pending_review: { badge: "bg-warning-light text-warning", dot: "bg-warning" },
  open: { badge: "bg-info-light text-info", dot: "bg-info" },
  accepted: { badge: "bg-primary-light text-primary", dot: "bg-primary" },
  in_progress: { badge: "bg-primary-light text-primary", dot: "bg-primary" },
  completed: { badge: "bg-success-light text-success-strong", dot: "bg-success" },
  rejected: { badge: "bg-danger-light text-danger-strong", dot: "bg-danger" },
  cancelled: { badge: "bg-border-light text-body", dot: "bg-muted" },
};

const UNKNOWN: BadgeStyle = { label: "Unknown", badge: "bg-border-light text-body", dot: "bg-muted" };

/** The real status the API holds, with the canonical label; an unexpected value shows "Unknown" instead of crashing. */
export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const style = lookupOr(STYLES, status, null);
  return <StatusBadge {...(style ? { ...style, label: lookupOr(CAMPAIGN_STATUS_LABELS, status, "Unknown") } : UNKNOWN)} />;
}
