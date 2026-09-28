"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { FiChevronDown, FiSearch } from "react-icons/fi";
import type { TicketQuery } from "@/types/support";
import { buildTicketsHref, TICKET_STATUSES } from "../ticket-query";

const SEARCH_DELAY_MS = 300;

// Filters live in the URL so a filtered view can be shared or refreshed.
export function TicketFilters({ query }: { query: TicketQuery }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [search, setSearch] = useState(query.q);
  const [pushedQ, setPushedQ] = useState(query.q);
  const [syncedQ, setSyncedQ] = useState(query.q);

  // The URL's q can also change from outside (the top bar search). Pick that up,
  // but ignore the echo of our own debounced update so typing isn't interrupted.
  if (query.q !== syncedQ) {
    setSyncedQ(query.q);
    if (query.q !== pushedQ) setSearch(query.q);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  function navigate(next: TicketQuery) {
    startTransition(() => router.replace(buildTicketsHref(next), { scroll: false }));
  }

  function onSearchChange(value: string) {
    setSearch(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPushedQ(value.trim());
      navigate({ ...query, q: value });
    }, SEARCH_DELAY_MS);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center" aria-busy={isPending}>
      <label className="relative inline-flex">
        <span className="sr-only">Filter by status</span>
        <select
          value={query.status}
          onChange={(event) => navigate({ ...query, status: event.target.value as TicketQuery["status"] })}
          className="h-10 w-full appearance-none rounded-lg border border-border bg-surface py-2 pl-3 pr-9 text-sm text-heading focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15 sm:w-auto"
        >
          <option value="all">All Statuses</option>
          {TICKET_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
      </label>

      <label className="relative sm:w-72">
        <span className="sr-only">Search by subject or user</span>
        <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by subject or user..."
          className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-heading placeholder:text-muted focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
        />
      </label>

      {isPending && <span className="text-xs text-muted">Updating…</span>}
    </div>
  );
}
