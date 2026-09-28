import Link from "next/link";
import { FiActivity, FiCreditCard, FiLock, FiShield } from "react-icons/fi";
import { cn, formatRelativeTime } from "@/lib/utils";
import { listSecurityAlerts } from "@/services/user-management.service";
import type { AlertKind } from "@/types/user-management";
import { AlertActions } from "./alert-actions";

const KIND: Record<AlertKind, { label: string; icon: typeof FiLock }> = {
  "failed-logins": { label: "Failed sign-ins", icon: FiLock },
  "follower-spike": { label: "Follower spike", icon: FiActivity },
  "payout-change": { label: "Payout change", icon: FiCreditCard },
};

export async function SecurityAlerts() {
  const alerts = await listSecurityAlerts();

  return (
    <section aria-labelledby="alerts-heading" className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 id="alerts-heading" className="scroll-mt-28 flex items-center gap-2 font-display text-base font-bold text-heading">
          <FiShield className="text-navy" aria-hidden />
          Security Alerts
        </h2>
        <span className="rounded-full bg-border-light px-2.5 py-0.5 text-xs font-semibold text-body">{alerts.length} open</span>
      </div>
      <p className="mt-1 text-sm text-muted">Raised automatically when an account behaves unusually.</p>

      {alerts.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
          All clear. No suspicious activity detected.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {alerts.map((alert) => {
            const { label, icon: Icon } = KIND[alert.kind];
            return (
              <li key={alert.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      alert.severity === "high" ? "bg-danger-light text-danger-strong" : "bg-warning-light text-warning",
                    )}
                  >
                    <Icon aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-heading">
                      {label} ·{" "}
                      <Link href={`/admin/users/${alert.userId}`} className="text-navy hover:underline">
                        {alert.userName}
                      </Link>
                    </p>
                    <p className="mt-0.5 text-sm text-body">{alert.detail}</p>
                    <p className="mt-1 text-xs text-muted">
                      <span className="font-semibold uppercase">{alert.severity}</span> ·{" "}
                      <time dateTime={alert.detectedAt}>{formatRelativeTime(alert.detectedAt)}</time>
                    </p>
                  </div>
                </div>
                <AlertActions alertId={alert.id} userId={alert.userId} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
