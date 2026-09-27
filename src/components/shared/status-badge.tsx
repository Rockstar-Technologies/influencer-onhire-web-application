import { cn } from "@/lib/utils";

export interface BadgeStyle {
  label: string;
  badge: string;
  dot: string;
}

export function StatusBadge({ label, badge, dot }: BadgeStyle) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", badge)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden />
      {label}
    </span>
  );
}
