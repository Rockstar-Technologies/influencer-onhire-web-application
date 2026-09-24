"use client";

import { useEffect, useRef, useState } from "react";
import { FiCheck, FiChevronDown, FiGlobe, FiSliders, FiX } from "react-icons/fi";
import { cn } from "@/lib/utils";
import type { InfluencerSearchOptions } from "@/types/influencer-filters";

type Selection = Record<string, string[]>;

interface ActiveFilter {
  groupKey: string;
  value: string;
  label: string;
}

export function HeroSearch({ options }: { options: InfluencerSearchOptions }) {
  const { sortOptions, filterGroups } = options;
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState(sortOptions[0].value);
  const [selected, setSelected] = useState<Selection>({});
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!filtersRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const activeFilters: ActiveFilter[] = filterGroups.flatMap((group) =>
    (selected[group.key] ?? []).map((value) => ({
      groupKey: group.key,
      value,
      label: group.options.find((option) => option.value === value)?.label ?? value,
    })),
  );

  function toggle(groupKey: string, mode: "single" | "multiple", value: string) {
    setSelected((current) => {
      const values = current[groupKey] ?? [];
      const isSelected = values.includes(value);
      let next: string[];
      if (mode === "single") next = isSelected ? [] : [value];
      else next = isSelected ? values.filter((item) => item !== value) : [...values, value];
      return { ...current, [groupKey]: next };
    });
  }

  return (
    <form action="/coming-soon" className="mt-10 w-full rounded-2xl border border-border bg-surface p-5 text-left shadow-sm">
      <input type="hidden" name="title" value="Browse Influencers" />
      {activeFilters.map((filter) => (
        <input key={`${filter.groupKey}-${filter.value}`} type="hidden" name={filter.groupKey} value={filter.value} />
      ))}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          name="q"
          placeholder="Search by username or description — e.g. @amara.styles, beauty, fitness..."
          className="h-11 flex-1 rounded-md border border-border bg-surface-alt px-4 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          className="h-10 rounded-lg bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Search
        </button>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-surface-alt px-4 text-xs font-semibold text-heading"
        >
          <FiGlobe className="text-sky-500" />
          EN
          <FiChevronDown />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div ref={filtersRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-haspopup="dialog"
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
              open || activeFilters.length > 0
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

          {open && (
            <div
              role="dialog"
              aria-label="Filter influencers"
              className="absolute left-0 top-full z-30 mt-2 w-[min(34rem,calc(100vw-3rem))] rounded-xl border border-border bg-surface shadow-xl"
            >
              <div className="max-h-[60vh] space-y-5 overflow-y-auto p-5">
                {filterGroups.map((group) => (
                  <fieldset key={group.key}>
                    <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                      {group.label}
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((option) => {
                        const isSelected = (selected[group.key] ?? []).includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => toggle(group.key, group.mode, option.value)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                              isSelected
                                ? "border-primary bg-primary text-white"
                                : "border-border bg-surface text-body hover:border-primary-border hover:text-primary",
                            )}
                          >
                            {isSelected && <FiCheck size={12} />}
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <button
                  type="button"
                  onClick={() => setSelected({})}
                  disabled={activeFilters.length === 0}
                  className="text-xs font-semibold text-body underline-offset-2 hover:text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
                >
                  Clear all
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  Show results
                </button>
              </div>
            </div>
          )}
        </div>

        <label className="relative inline-flex items-center">
          <span className="sr-only">Sort by</span>
          <select
            name="sort"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
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

        {activeFilters.map((filter) => (
          <button
            key={`${filter.groupKey}-${filter.value}`}
            type="button"
            onClick={() =>
              toggle(filter.groupKey, filterGroups.find((group) => group.key === filter.groupKey)!.mode, filter.value)
            }
            aria-label={`Remove filter ${filter.label}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-border/60"
          >
            {filter.label}
            <FiX size={12} />
          </button>
        ))}

        {activeFilters.length > 0 && (
          <button
            type="button"
            onClick={() => setSelected({})}
            className="text-xs font-semibold text-muted underline-offset-2 hover:text-primary hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
    </form>
  );
}
