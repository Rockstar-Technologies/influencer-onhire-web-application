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

// "Samuel Ndolo" -> "SN"
export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// 100000 -> "100,000 Frs"
export function formatPrice(value: number) {
  return `${value.toLocaleString("en-US")} Frs`;
}

// ISO timestamp -> "Just now", "10 min ago", "3 hours ago", "Yesterday", "4 days ago", "12 Sep"
export function formatRelativeTime(iso: string, now = Date.now()) {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// Same as formatRelativeTime but for mid-sentence use: "Opened yesterday", "Opened 12 Sep".
export function formatRelativeTimeInline(iso: string, now = Date.now()) {
  const text = formatRelativeTime(iso, now);
  return /ago$|^Just now$|^Yesterday$/.test(text) ? text.toLowerCase() : text;
}
