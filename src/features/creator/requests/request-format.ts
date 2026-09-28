const DAY_MS = 86_400_000;

function toDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function formatFrs(amount: number) {
  return `${amount.toLocaleString("en-US")} Frs`;
}

export function formatFcfa(amount: number) {
  return `${amount.toLocaleString("en-US")} FCFA`;
}

export function formatDate(value: string) {
  return toDate(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatReceived(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - toDate(value).getTime()) / DAY_MS);
  if (days <= 0) return "received today";
  if (days === 1) return "received yesterday";
  return `received ${days} days ago`;
}
