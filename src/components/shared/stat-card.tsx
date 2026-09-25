import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  unit,
  icon,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", accent)}>{icon}</span>
      </div>
      <p className="mt-3 flex items-baseline gap-1.5 tabular-nums">
        <span className="text-[1.75rem] font-bold leading-none tracking-tight text-heading">{value}</span>
        {unit && <span className="text-sm font-semibold text-muted">{unit}</span>}
      </p>
    </div>
  );
}
