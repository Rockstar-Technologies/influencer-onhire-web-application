import { cn, formatCount, formatPrice } from "@/lib/utils";
import type { AccountType, Dispute, TrendPoint, UserPerformance } from "@/types/user-management";
import { TrendChart } from "@/components/shared/trend-chart";

function growth(first: number, last: number) {
  if (first <= 0) return null;
  const percent = Math.round(((last - first) / first) * 100);
  return `${percent >= 0 ? "+" : ""}${percent}%`;
}

// Full values like "1,200,000 CFA" are too wide for axis labels.
const shortNumber = (value: number) => (value === 0 ? "0" : formatCount(value));

export function PerformancePanel({
  type,
  performance,
  trend,
  disputes,
}: {
  type: AccountType;
  performance: UserPerformance;
  trend: TrendPoint[];
  disputes: Dispute[];
}) {
  const isInfluencer = type === "creator";
  const openDisputes = disputes.filter((dispute) => dispute.status === "open").length;
  const kpis = [
    { label: isInfluencer ? "Lifetime Earnings" : "Lifetime Spend", value: formatPrice(performance.lifetimeValue) },
    { label: "Campaign Success", value: performance.campaignsCompleted ? `${performance.campaignSuccessRate}%` : "—", hint: `${performance.campaignsCompleted} completed` },
    { label: "Review Score", value: performance.reviewCount ? `${performance.avgReviewScore.toFixed(1)} / 5` : "—", hint: `${performance.reviewCount} reviews` },
    { label: "Disputes", value: String(disputes.length), hint: openDisputes ? `${openDisputes} still open` : "None open" },
  ];

  const first = trend[0];
  const last = trend.at(-1);
  const audienceGrowth = first && last ? growth(first.audience, last.audience) : null;
  const hasActivity = trend.some((point) => point.campaigns > 0 || point.revenue > 0);

  return (
    <section aria-labelledby="performance-heading" className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 id="performance-heading" className="font-display text-base font-bold text-heading">
        Performance
      </h2>

      <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ label, value, hint }) => (
          <div key={label} className="rounded-xl bg-surface-alt p-4">
            <dt className="text-xs text-body">{label}</dt>
            <dd className="mt-1 font-display text-xl font-bold text-heading">{value}</dd>
            {hint && <dd className="text-xs text-muted">{hint}</dd>}
          </div>
        ))}
      </dl>

      {trend.length > 0 && (
        <>
          <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-sm font-bold text-heading">Trends · last 6 months</h3>
            {isInfluencer && audienceGrowth && <p className="text-xs text-muted">Followers {audienceGrowth} since {first.month}</p>}
          </div>
          <div className={cn("mt-4 grid gap-8", isInfluencer ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
            {isInfluencer && (
              <TrendChart
                title="Follower growth"
                kind="line"
                points={trend.map((point) => ({ label: point.month, value: point.audience }))}
                format={(value) => `${value.toLocaleString("en-US")} followers`}
                axisFormat={shortNumber}
              />
            )}
            {hasActivity ? (
              <>
                <TrendChart
                  title="Campaigns per month"
                  kind="bar"
                  points={trend.map((point) => ({ label: point.month, value: point.campaigns }))}
                  format={(value) => `${value} ${value === 1 ? "campaign" : "campaigns"}`}
                  axisFormat={String}
                />
                <TrendChart
                  title={isInfluencer ? "Revenue earned" : "Platform spend"}
                  kind="bar"
                  points={trend.map((point) => ({ label: point.month, value: point.revenue }))}
                  format={formatPrice}
                  axisFormat={shortNumber}
                />
              </>
            ) : (
              <p className="flex items-center justify-center rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted lg:col-span-2">
                No campaign activity yet. Charts for campaigns and revenue appear after their first campaign.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
