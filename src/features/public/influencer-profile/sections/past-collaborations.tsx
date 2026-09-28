import { Panel } from "@/components/shared/panel";
import type { Collaboration } from "@/types/influencer";

export function PastCollaborations({ collaborations }: { collaborations: Collaboration[] }) {
  return (
    <Panel title="Past Collaborations">
      <ul className="grid gap-3 sm:grid-cols-3">
        {collaborations.map(({ brand, campaign, year }) => (
          <li key={`${brand}-${year}`} className="rounded-xl border border-border p-4">
            <p className="text-sm font-semibold text-heading">{brand}</p>
            <p className="mt-1 text-xs text-muted">
              {campaign} · {year}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
