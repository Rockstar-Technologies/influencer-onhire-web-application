export function splitList(value?: string) {
  return (value ?? "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinWithAmpersand(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} & ${items[items.length - 1]}`;
}

export function formatFrs(amount: number) {
  return `${amount.toLocaleString("en-US")} Frs`;
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function formatDuration(startDate: string, endDate: string) {
  const format = (value: string) => toDate(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const days = Math.round((toDate(endDate).getTime() - toDate(startDate).getTime()) / 86_400_000) + 1;
  return `${format(startDate)} – ${format(endDate)} (${days} ${days === 1 ? "day" : "days"})`;
}
