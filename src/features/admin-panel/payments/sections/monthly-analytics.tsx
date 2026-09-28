"use client";

import { useState } from "react";
import { TrendChart } from "@/components/shared/trend-chart";
import { cn, formatPrice } from "@/lib/utils";
import type { MonthlyPaymentStat } from "@/types/payments";

type Metric = "escrowVolume" | "commission" | "avgReleaseDays";

const METRICS: { key: Metric; label: string; lowerIsBetter?: boolean }[] = [
  { key: "escrowVolume", label: "Escrow volume" },
  { key: "commission", label: "Commission revenue" },
  { key: "avgReleaseDays", label: "Avg. release time", lowerIsBetter: true },
];

const formatDays = (value: number) => `${value.toFixed(1)} days`;
const shortCfa = (value: number) => (value === 0 ? "0" : `${+(value / 1_000_000).toFixed(1)}M`);

// One metric at a time so the chart never needs two y-axes.
export function MonthlyAnalytics({ stats }: { stats: MonthlyPaymentStat[] }) {
  const [metric, setMetric] = useState<Metric>("escrowVolume");
  const current = METRICS.find((option) => option.key === metric)!;
  const isDays = metric === "avgReleaseDays";
  const format = isDays ? formatDays : formatPrice;

  const values = stats.map((stat) => stat[metric]);
  const latest = stats.at(-1)!;
  const previous = stats.at(-2)!;
  const change = ((latest[metric] - previous[metric]) / previous[metric]) * 100;
  const improved = current.lowerIsBetter ? change <= 0 : change >= 0;
  const total = values.reduce((sum, value) => sum + value, 0);

  return (
    <section aria-labelledby="analytics-heading" className="min-w-0 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="analytics-heading" className="font-display text-base font-bold text-heading">
            Monthly Analytics
          </h2>
          <p className="mt-1 text-sm text-muted">Platform-wide, last 6 months</p>
        </div>
        <div role="group" aria-label="Chart metric" className="flex flex-wrap gap-2">
          {METRICS.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={metric === option.key}
              onClick={() => setMetric(option.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                metric === option.key ? "border-navy bg-info-light text-navy" : "border-border text-body hover:border-navy/30 hover:text-heading",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
        <div>
          <dt className="text-xs text-muted">{latest.month} (this month)</dt>
          <dd className="font-display text-lg font-bold tabular-nums text-heading">{format(latest[metric])}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Change vs {previous.month}</dt>
          <dd className={cn("font-display text-lg font-bold tabular-nums", improved ? "text-success-strong" : "text-danger-strong")}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{isDays ? "6-month average" : "6-month total"}</dt>
          <dd className="font-display text-lg font-bold tabular-nums text-heading">{format(isDays ? total / values.length : total)}</dd>
        </div>
      </dl>

      {/* SVG text scales with the viewBox, so phones get a narrower one to keep labels readable. */}
      {[
        { className: "mt-4 hidden sm:block", width: 1040, height: 280 },
        { className: "mt-4 sm:hidden", width: 360, height: 220 },
      ].map((size) => (
        <div key={size.width} className={size.className}>
          <TrendChart
            title={`${current.label} by month`}
            hideTitle
            kind="bar"
            points={stats.map((stat) => ({ label: stat.month, value: stat[metric] }))}
            format={format}
            axisFormat={isDays ? (value) => `${value}d` : shortCfa}
            width={size.width}
            height={size.height}
          />
        </div>
      ))}
    </section>
  );
}
