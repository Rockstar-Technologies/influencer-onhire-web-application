import type { TicketQuery } from "@/types/support";
import { NewTicketDialog } from "./sections/new-ticket-dialog";
import { SupportStats } from "./sections/support-stats";
import { TicketTable } from "./sections/ticket-table";

export function SupportPage({ query }: { query: TicketQuery }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-heading sm:text-3xl">Support &amp; Communication</h1>
          <p className="mt-2 text-sm text-body">Respond to tickets and manage messages from influencers and brands.</p>
        </div>
        <NewTicketDialog />
      </div>

      <SupportStats />
      <TicketTable query={query} />
    </div>
  );
}
