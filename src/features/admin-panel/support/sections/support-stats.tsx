import { getSupportStats } from "@/services/support.service";

export async function SupportStats() {
  const stats = await getSupportStats();
  const cards = [
    { label: "Open Tickets", value: String(stats.openTickets) },
    { label: "Urgent", value: String(stats.urgent) },
    { label: "Resolved This Week", value: String(stats.resolvedThisWeek) },
    { label: "Avg. Response Time", value: `${stats.avgResponseHours} hrs` },
  ];

  return (
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value }) => (
        <div key={label} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <dt className="text-sm text-body">{label}</dt>
          <dd className="mt-2 font-display text-3xl font-bold text-heading">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
