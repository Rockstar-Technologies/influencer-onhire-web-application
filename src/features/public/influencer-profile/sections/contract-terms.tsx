import { FiCheckCircle } from "react-icons/fi";
import { CollapsiblePanel } from "@/components/shared/collapsible-panel";

export function ContractTerms({ minimumBooking, terms }: { minimumBooking: string; terms: string[] }) {
  const allTerms = [`Minimum booking: ${minimumBooking}`, ...terms];

  return (
    <CollapsiblePanel title="Contract Terms" summary={`Min. booking ${minimumBooking} · ${allTerms.length} terms`}>
      <ul className="space-y-3">
        {allTerms.map((term) => (
          <li key={term} className="flex items-start gap-2.5 text-sm text-body">
            <FiCheckCircle className="mt-0.5 shrink-0 text-success" />
            {term}
          </li>
        ))}
      </ul>
    </CollapsiblePanel>
  );
}
