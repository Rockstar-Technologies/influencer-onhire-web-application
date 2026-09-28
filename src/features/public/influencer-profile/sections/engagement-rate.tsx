import { Panel } from "@/components/shared/panel";

export function EngagementRate({ engagementRate }: { engagementRate: number }) {
  return (
    <Panel title="Engagement Rate">
      <div className="flex items-center gap-5 rounded-xl border border-primary-border bg-primary-light px-5 py-6">
        <span className="text-4xl font-extrabold text-primary">{engagementRate.toFixed(1)}%</span>
        <span className="text-xs text-body">
          Average across platforms
          <br />
          (industry avg. 3–5%)
        </span>
      </div>
    </Panel>
  );
}
