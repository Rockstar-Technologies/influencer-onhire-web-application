import { Panel } from "@/components/shared/panel";
import type { PublicProfile } from "@/lib/api/schemas";

export function PastCollaborations({ collaborations }: { collaborations: PublicProfile["collaborations"] }) {
  if (collaborations.length === 0) return null;
  return (
    <Panel title="Past Collaborations">
      <ul className="grid gap-3 sm:grid-cols-3">
        {collaborations.map(({ brandName, description, year }) => (
          <li key={`${brandName}-${year}`} className="rounded-xl border border-border p-4">
            <p className="text-sm font-semibold text-heading">{brandName}</p>
            <p className="mt-1 text-xs text-muted">
              {description ? `${description} · ` : ""}
              {year}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
