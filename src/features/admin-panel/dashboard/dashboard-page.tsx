import Link from "next/link";
import { FiDownload } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { getCurrentAdmin } from "@/services/support.service";
import type { DashboardRange } from "@/types/dashboard";
import { DEFAULT_RANGE, RANGES } from "./dashboard-range";
import { AttentionPanel } from "./sections/attention-panel";
import { DashboardStats } from "./sections/dashboard-stats";
import { RecentCampaigns } from "./sections/recent-campaigns";
import { RevenuePanel } from "./sections/revenue-panel";
import { TopInfluencers } from "./sections/top-influencers";

export async function DashboardPage({ range }: { range: DashboardRange }) {
  const admin = await getCurrentAdmin();
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{today}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-heading sm:text-3xl">Dashboard Overview</h1>
          <p className="mt-2 text-sm text-body">Welcome back, {admin.name.split(" ")[0]}. Here&apos;s what&apos;s happening across the platform.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <nav aria-label="Date range" className="flex rounded-lg border border-border bg-surface p-1 shadow-sm">
            {RANGES.map((option) => (
              <Link
                key={option.value}
                href={option.value === DEFAULT_RANGE ? "/admin" : `/admin?range=${option.value}`}
                scroll={false}
                aria-current={option.value === range ? "true" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                  option.value === range ? "bg-navy text-white shadow-sm" : "text-body hover:bg-surface-alt hover:text-heading",
                )}
              >
                {option.label}
              </Link>
            ))}
          </nav>
          <a
            href={`/admin/export?range=${range}`}
            download
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-heading shadow-sm transition-colors hover:border-navy/30 hover:text-navy"
          >
            <FiDownload aria-hidden />
            Export report
          </a>
        </div>
      </div>

      <DashboardStats range={range} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenuePanel range={range} />
        </div>
        <AttentionPanel />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <RecentCampaigns />
        </div>
        <TopInfluencers />
      </div>
    </div>
  );
}
