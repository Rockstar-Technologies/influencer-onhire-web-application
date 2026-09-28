import type { DashboardRange } from "@/types/dashboard";

export const RANGES: { value: DashboardRange; label: string; long: string }[] = [
  { value: "7d", label: "7 days", long: "last 7 days" },
  { value: "30d", label: "30 days", long: "last 30 days" },
  { value: "90d", label: "90 days", long: "last 90 days" },
];

export const DEFAULT_RANGE: DashboardRange = "30d";

export function parseRange(value: string | string[] | undefined): DashboardRange {
  const raw = Array.isArray(value) ? value[0] : value;
  return RANGES.some((range) => range.value === raw) ? (raw as DashboardRange) : DEFAULT_RANGE;
}

export function rangeLabel(range: DashboardRange) {
  return RANGES.find((option) => option.value === range)!.long;
}
