import { Panel } from "@/components/shared/panel";

/** The rate is supplied by the creator; it is called "verified" only when an administrator verified it (the API says so). */
export function EngagementRate({ engagementRate, verified }: { engagementRate: number | null; verified: boolean }) {
  return (
    <Panel title="Engagement Rate">
      {engagementRate === null ? (
        <p className="rounded-xl border border-border px-5 py-6 text-sm text-muted">This creator hasn&apos;t shared an engagement rate.</p>
      ) : (
        <div className="flex items-center gap-5 rounded-xl border border-primary-border bg-primary-light px-5 py-6">
          <span className="text-4xl font-extrabold text-primary">{engagementRate.toFixed(1)}%</span>
          <span className="text-xs text-body">
            {verified ? "Verified by our team" : "Reported by the creator"}
            <br />
            (not independently measured)
          </span>
        </div>
      )}
    </Panel>
  );
}
