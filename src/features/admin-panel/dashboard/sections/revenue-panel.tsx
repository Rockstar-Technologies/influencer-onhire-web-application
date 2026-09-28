import { TrendChart } from "@/components/shared/trend-chart";
import { formatCount, formatPrice } from "@/lib/utils";
import { getRevenueSeries } from "@/services/dashboard.service";
import type { DashboardRange } from "@/types/dashboard";
import { rangeLabel } from "../dashboard-range";

export async function RevenuePanel({ range }: { range: DashboardRange }) {
  const points = await getRevenueSeries(range);
  const total = points.reduce((sum, point) => sum + point.revenue, 0);
  const best = points.reduce((top, point) => (point.revenue > top.revenue ? point : top), points[0]);

  return (
    <section aria-labelledby="revenue-heading" className="h-full min-w-0 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="revenue-heading" className="font-display text-base font-bold text-heading">
            Platform Revenue
          </h2>
          <p className="mt-1 text-sm text-muted">
            Fees earned per {range === "90d" ? "week" : "day"}, {rangeLabel(range)}
          </p>
        </div>
        <dl className="flex gap-6 text-right">
          <div>
            <dt className="text-xs text-muted">Total</dt>
            <dd className="font-display text-lg font-bold text-heading">{formatPrice(total)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Best {range === "90d" ? "week" : "day"}</dt>
            <dd className="font-display text-lg font-bold text-heading">{best.label}</dd>
          </div>
        </dl>
      </div>

      {/* SVG text scales with the viewBox, so phones get a narrower viewBox to keep labels readable. */}
      {[
        { className: "mt-4 hidden sm:block", width: 720, height: 300 },
        { className: "mt-4 sm:hidden", width: 360, height: 220 },
      ].map((size) => (
        <div key={size.width} className={size.className}>
          <TrendChart
            title={`Platform revenue, ${rangeLabel(range)}`}
            hideTitle
            kind={points.length > 14 ? "line" : "bar"}
            points={points.map((point) => ({ label: point.label, value: point.revenue }))}
            format={formatPrice}
            axisFormat={(value) => (value === 0 ? "0" : formatCount(value))}
            width={size.width}
            height={size.height}
          />
        </div>
      ))}
    </section>
  );
}
