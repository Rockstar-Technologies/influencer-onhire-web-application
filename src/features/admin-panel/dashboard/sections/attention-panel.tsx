import Link from "next/link";
import { FiAlertOctagon, FiAlertTriangle, FiCheckCircle, FiChevronRight } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { listAttentionItems } from "@/services/dashboard.service";

export async function AttentionPanel() {
  const items = await listAttentionItems();
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section aria-labelledby="attention-heading" className="min-w-0 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="attention-heading" className="font-display text-base font-bold text-heading">
          Needs Attention
        </h2>
        {total > 0 && <span className="rounded-full bg-danger-light px-2.5 py-0.5 text-xs font-bold text-danger-strong">{total}</span>}
      </div>
      <p className="mt-1 text-sm text-muted">What to act on today, most urgent first.</p>

      {items.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-border px-4 py-10 text-center">
          <FiCheckCircle className="text-success" size={24} aria-hidden />
          <p className="mt-2 text-sm font-semibold text-heading">All clear</p>
          <p className="text-xs text-muted">Nothing needs your attention right now.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => {
            const urgent = item.severity === "urgent";
            const Icon = urgent ? FiAlertOctagon : FiAlertTriangle;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition-all hover:border-navy/25 hover:bg-surface-alt hover:shadow-sm"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      urgent ? "bg-danger-light text-danger-strong" : "bg-warning-light text-warning",
                    )}
                  >
                    <Icon aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-heading">{item.label}</span>
                  <span className={cn("font-display text-lg font-bold tabular-nums", urgent ? "text-danger-strong" : "text-warning")}>
                    {item.count}
                  </span>
                  <FiChevronRight className="shrink-0 text-muted transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden />
                  <span className="sr-only">{urgent ? "(urgent)" : "(needs review)"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
