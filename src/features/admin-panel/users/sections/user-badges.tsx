import { FiAlertCircle, FiCheckCircle, FiClock } from "react-icons/fi";
import { StatusBadge, type BadgeStyle } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import type { AccountStatus, AccountType, ComplianceStatus } from "@/types/user-management";

const ACCOUNT_STATUS_STYLES: Record<AccountStatus, BadgeStyle> = {
  active: { label: "Active", badge: "bg-success-light text-success-strong", dot: "bg-success" },
  pending: { label: "Pending", badge: "bg-warning-light text-warning", dot: "bg-warning" },
  suspended: { label: "Suspended", badge: "bg-danger-light text-danger-strong", dot: "bg-danger" },
  rejected: { label: "Rejected", badge: "bg-border-light text-body", dot: "bg-muted" },
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return <StatusBadge {...ACCOUNT_STATUS_STYLES[status]} />;
}

export function AccountTypeTag({ type }: { type: AccountType }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        type === "creator" ? "bg-primary-light text-primary" : "bg-info-light text-navy",
      )}
    >
      {type === "creator" ? "influencer" : type}
    </span>
  );
}

const COMPLIANCE: Record<ComplianceStatus, { label: string; icon: typeof FiCheckCircle; className: string }> = {
  verified: { label: "Verified", icon: FiCheckCircle, className: "text-success-strong" },
  in_review: { label: "In review", icon: FiClock, className: "text-warning" },
  rejected: { label: "Rejected", icon: FiAlertCircle, className: "text-danger-strong" },
  missing: { label: "Missing", icon: FiAlertCircle, className: "text-danger-strong" },
};

export function ComplianceIndicator({ status }: { status: ComplianceStatus }) {
  const { label, icon: Icon, className } = COMPLIANCE[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold", className)}>
      <Icon aria-hidden />
      {label}
    </span>
  );
}
