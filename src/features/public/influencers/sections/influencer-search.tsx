"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { FiChevronDown, FiSearch, FiSliders } from "react-icons/fi";
import {
  ActiveFilterChips,
  FilterGroupFields,
  getActiveFilters,
  toggleFilterValue,
} from "@/components/shared/filter-chips";
import { cn } from "@/lib/utils";
import type { FilterGroup, InfluencerSearchOptions } from "@/types/influencer-filters";
import { buildDirectoryHref } from "../../creators/query";
import type { DirectoryQuery } from "../../creators/query";

interface InfluencerSearchProps {
  options: InfluencerSearchOptions;
  query: DirectoryQuery;
  children: ReactNode;
}

// All state lives in the URL. Changes are applied optimistically so chips and
// the sidebar respond instantly while the server re-renders the results.
export function InfluencerSearch({ options, query, children }: InfluencerSearchProps) {
  const { sortOptions, filterGroups } = options;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(query);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const activeFilters = getActiveFilters(filterGroups, current.filters);

  function navigate(next: DirectoryQuery) {
    startTransition(() => {
      setCurrent(next);
      router.push(buildDirectoryHref({ ...next, cursor: "" }), { scroll: false });
    });
  }

  function toggle(group: FilterGroup, value: string) {
    navigate({ ...current, filters: toggleFilterValue(current.filters, group, value) });
  }

  function clearFilters() {
    navigate({ ...current, filters: {} });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = new FormData(event.currentTarget).get("q");
    navigate({ ...current, q: typeof q === "string" ? q : "" });
  }

  return (
    <>
      <form onSubmit={onSubmit} role="search" className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search influencers</span>
          <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            key={query.q}
            type="text"
            name="q"
            defaultValue={query.q}
            placeholder="Search by name, @username, niche or city..."
            className="h-11 w-full rounded-md border border-border bg-surface-alt pl-10 pr-4 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="h-11 rounded-lg bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((value) => !value)}
          aria-expanded={mobileFiltersOpen}
          aria-controls="influencer-filters"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors lg:hidden",
            mobileFiltersOpen || activeFilters.length > 0
              ? "border-primary bg-primary-light text-primary"
              : "border-border bg-surface-alt text-heading hover:border-primary-border",
          )}
        >
          <FiSliders />
          Filters
          {activeFilters.length > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-white">
              {activeFilters.length}
            </span>
          )}
        </button>

        <label className="relative inline-flex items-center">
          <span className="sr-only">Sort by</span>
          <select
            value={current.sort || sortOptions[0].value}
            onChange={(event) => navigate({ ...current, sort: event.target.value })}
            className="appearance-none rounded-full border border-border bg-surface-alt py-2 pl-4 pr-9 text-xs font-medium text-heading focus:border-primary focus:outline-none"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </select>
          <FiChevronDown className="pointer-events-none absolute right-3 text-muted" />
        </label>

        <ActiveFilterChips
          filters={activeFilters}
          onRemove={(filter) => toggle(filterGroups.find((group) => group.key === filter.groupKey)!, filter.value)}
          onClear={clearFilters}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside
          id="influencer-filters"
          aria-label="Filter influencers"
          className={cn(
            "h-fit rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-24 lg:block",
            mobileFiltersOpen ? "block" : "hidden",
          )}
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-bold text-heading">Filters</h2>
            <button
              type="button"
              onClick={clearFilters}
              disabled={activeFilters.length === 0}
              className="text-xs font-semibold text-body underline-offset-2 hover:text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-5">
            <FilterGroupFields groups={filterGroups} selection={current.filters} onToggle={toggle} />
          </div>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
            className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover lg:hidden"
          >
            Show results
          </button>
        </aside>

        <div aria-busy={isPending} className={cn("min-w-0 transition-opacity", isPending && "opacity-60")}>
          {children}
        </div>
      </div>
    </>
  );
}
