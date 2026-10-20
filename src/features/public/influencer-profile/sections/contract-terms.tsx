import { FiCheckCircle } from "react-icons/fi";
import { CollapsiblePanel } from "@/components/shared/collapsible-panel";
import type { PublicProfile } from "@/lib/api/schemas";

/** The booking terms the creator published. The deposit/escrow wording is deliberately not shown here: payment terms are explained when hiring. */
export function ContractTerms({ minimumBooking, terms }: { minimumBooking: string; terms: PublicProfile["terms"] }) {
  const lines = [
    `Minimum booking: ${minimumBooking}`,
    ...(terms.deliverables ? [`Deliverables: ${terms.deliverables}`] : []),
    ...(terms.revisionsRounds ? [`${terms.revisionsRounds} ${terms.revisionsRounds === 1 ? "round" : "rounds"} of revisions`] : []),
    ...(terms.usageRightsMonths ? [`Content usage rights: ${terms.usageRightsMonths} months`] : []),
  ];
  return (
    <CollapsiblePanel title="Booking Terms" summary={`Min. booking ${minimumBooking}`}>
      <ul className="space-y-3">
        {lines.map((line) => (
          <li key={line} className="flex items-start gap-2.5 text-sm text-body">
            <FiCheckCircle className="mt-0.5 shrink-0 text-success" />
            {line}
          </li>
        ))}
      </ul>
    </CollapsiblePanel>
  );
}
