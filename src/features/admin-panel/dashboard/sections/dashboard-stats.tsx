import { FiAlertTriangle, FiLifeBuoy, FiLock, FiSpeaker, FiTrendingUp } from "react-icons/fi";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getDashboardKpis } from "@/services/dashboard.service";
import type { DashboardRange, PeriodValue } from "@/types/dashboard";
import { StatCardGrid, type StatCard } from "../../stat-cards";
import { RANGES } from "../dashboard-range";

// Arrows are only for change against the previous period; plain counts get a warning icon instead.
function Change({ value, range }: { value: PeriodValue; range: DashboardRange }) {
  if (value.previous === 0) return null;
  const percent = ((value.current - value.previous) / value.previous) * 100;
  const up = percent >= 0;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span
        className={cn(
          "rounded-full px-2 py-0.5 font-semibold",
          up ? "bg-success-light text-success-strong" : "bg-danger-light text-danger-strong",
        )}
      >
        {up ? "▲" : "▼"} {Math.abs(percent).toFixed(1)}%
      </span>
      <span className="text-muted">vs previous {RANGES.find((option) => option.value === range)?.label}</span>
    </span>
  );
}

function Warning({ children, tone }: { children: ReactNode; tone: "danger" | "warning" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold",
        tone === "danger" ? "bg-danger-light text-danger-strong" : "bg-warning-light text-warning",
      )}
    >
      <FiAlertTriangle aria-hidden />
      {children}
    </span>
  );
}

export async function DashboardStats({ range }: { range: DashboardRange }) {
  const kpis = await getDashboardKpis(range);
  const cards: StatCard[] = [
    {
      label: "Active Campaigns",
      value: String(kpis.activeCampaigns.current),
      hint: <Change value={kpis.activeCampaigns} range={range} />,
      icon: FiSpeaker,
      tone: "navy",
    },
    {
      label: "Platform Revenue",
      value: kpis.platformRevenue.current.toLocaleString("en-US"),
      unit: "CFA",
      hint: <Change value={kpis.platformRevenue} range={range} />,
      icon: FiTrendingUp,
      tone: "success",
    },
    {
      label: "Held in Escrow",
      value: kpis.inEscrow.toLocaleString("en-US"),
      unit: "CFA",
      hint: kpis.payoutRequests ? <Warning tone="danger">{kpis.payoutRequests} payouts to release</Warning> : "No payouts waiting",
      icon: FiLock,
      tone: "warning",
      href: "/admin/payments",
    },
    {
      label: "Open Support Tickets",
      value: String(kpis.openTickets),
      hint: kpis.urgentTickets ? <Warning tone="danger">{kpis.urgentTickets} urgent</Warning> : "None urgent",
      icon: FiLifeBuoy,
      tone: "danger",
      href: "/admin/support?status=open",
    },
  ];

  return <StatCardGrid cards={cards} />;
}
