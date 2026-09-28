export function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

// 8_400_000 -> "8.4M", 95_000 -> "95K", 0 -> "—"
export function formatCount(value: number) {
  if (value <= 0) return "—";
  if (value >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${+(value / 1_000).toFixed(1)}K`;
  return String(value);
}
