import { FiInbox } from "react-icons/fi";
import { formatRelativeTime } from "@/lib/utils";
import { listSupportTickets } from "@/services/support.service";
import type { TicketQuery } from "@/types/support";
import { PriorityBadge, StatusBadge } from "./ticket-badges";
import { TicketFilters } from "./ticket-filters";

const COLUMNS = ["Ticket", "Subject", "From", "Priority", "Status", "Updated"];

export async function TicketTable({ query }: { query: TicketQuery }) {
  const tickets = await listSupportTickets(query);
  const isFiltered = query.q !== "" || query.status !== "all";

  return (
    <section aria-labelledby="tickets-heading" className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <h2 id="tickets-heading" className="sr-only">
        Support tickets
      </h2>
      <TicketFilters query={query} />

      {tickets.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <FiInbox className="text-muted" size={28} aria-hidden />
          <p className="mt-3 font-display text-base font-bold text-heading">
            {isFiltered ? "No tickets match these filters" : "No support tickets yet"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {isFiltered ? "Try another status or search term." : "New tickets from influencers and brands will show up here."}
          </p>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                {COLUMNS.map((column) => (
                  <th key={column} scope="col" className="px-4 pb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="transition-colors hover:bg-surface-alt">
                  <td className="whitespace-nowrap px-4 py-3.5 font-medium text-heading">#{ticket.number}</td>
                  <td className="px-4 py-3.5 text-heading">{ticket.subject}</td>
                  <td className="px-4 py-3.5">
                    <span className="block text-heading">{ticket.from.name}</span>
                    <span className="block text-xs capitalize text-muted">{ticket.from.role === "creator" ? "influencer" : ticket.from.role}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <PriorityBadge priority={ticket.priority} />
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-body">
                    <time dateTime={ticket.updatedAt}>{formatRelativeTime(ticket.updatedAt)}</time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 px-4 text-xs text-muted">
            Showing {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
          </p>
        </div>
      )}
    </section>
  );
}
