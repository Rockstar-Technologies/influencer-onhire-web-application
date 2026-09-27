"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { FiChevronDown, FiSearch } from "react-icons/fi";
import type { UserFilterOptions, UserQuery } from "@/types/user-management";
import { ACCOUNT_STATUSES, ACCOUNT_TYPES, buildUsersHref, ENGAGEMENT_THRESHOLDS, isFilteredQuery } from "../user-query";

const SEARCH_DELAY_MS = 300;

const selectClass =
  "h-10 w-full appearance-none rounded-lg border border-border bg-surface py-2 pl-3 pr-9 text-sm text-heading focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15";

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative inline-flex">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={selectClass}>
        {children}
      </select>
      <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
    </label>
  );
}

// Filters live in the URL so a filtered view can be shared, bookmarked or refreshed.
export function UserFilters({ query, options }: { query: UserQuery; options: UserFilterOptions }) {
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

  function navigate(next: UserQuery) {
    startTransition(() => router.replace(buildUsersHref(next), { scroll: false }));
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
    <div className="space-y-3" aria-busy={isPending}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative lg:w-80">
          <span className="sr-only">Search by name or email</span>
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name or email..."
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-heading placeholder:text-muted focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          />
        </label>

        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <FilterSelect label="Account type" value={query.type} onChange={(type) => navigate({ ...query, type: type as UserQuery["type"] })}>
            <option value="all">All types</option>
            {ACCOUNT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Status" value={query.status} onChange={(status) => navigate({ ...query, status: status as UserQuery["status"] })}>
            <option value="all">All statuses</option>
            {ACCOUNT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Location" value={query.location} onChange={(location) => navigate({ ...query, location })}>
            <option value="">All locations</option>
            {options.locations.map((location) => (
              <option key={location}>{location}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Niche or industry" value={query.niche} onChange={(niche) => navigate({ ...query, niche })}>
            <option value="">All niches</option>
            {options.niches.map((niche) => (
              <option key={niche}>{niche}</option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Minimum engagement rate"
            value={String(query.minEngagement)}
            onChange={(value) => navigate({ ...query, minEngagement: Number(value) })}
          >
            {ENGAGEMENT_THRESHOLDS.map((threshold) => (
              <option key={threshold} value={threshold}>
                {threshold === 0 ? "Any engagement" : `${threshold}%+ engagement`}
              </option>
            ))}
          </FilterSelect>
        </div>
      </div>

      <div className="flex h-5 items-center gap-3 text-xs">
        {isFilteredQuery(query) && (
          <Link href="/admin/users" scroll={false} onClick={() => setSearch("")} className="font-semibold text-navy hover:underline">
            Clear all filters
          </Link>
        )}
        {isPending && <span className="text-muted">Updating…</span>}
      </div>
    </div>
  );
}
