"use client";

import { FiCheck, FiX } from "react-icons/fi";
import { cn } from "@/lib/utils";
import type { FilterGroup } from "@/types/influencer-filters";

export type FilterSelection = Record<string, string[]>;

export interface ActiveFilter {
  groupKey: string;
  value: string;
  label: string;
}

export function toggleFilterValue(selection: FilterSelection, group: FilterGroup, value: string): FilterSelection {
  const values = selection[group.key] ?? [];
  const isSelected = values.includes(value);
  let next: string[];
  if (group.mode === "single") next = isSelected ? [] : [value];
  else next = isSelected ? values.filter((item) => item !== value) : [...values, value];
  return { ...selection, [group.key]: next };
}

export function getActiveFilters(groups: FilterGroup[], selection: FilterSelection): ActiveFilter[] {
  return groups.flatMap((group) =>
    (selection[group.key] ?? []).map((value) => ({
      groupKey: group.key,
      value,
      label: group.options.find((option) => option.value === value)?.label ?? value,
    })),
  );
}

export function FilterGroupFields({
  groups,
  selection,
  onToggle,
}: {
  groups: FilterGroup[];
  selection: FilterSelection;
  onToggle: (group: FilterGroup, value: string) => void;
}) {
  return (
    <>
      {groups.map((group) => (
        <fieldset key={group.key}>
          <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">{group.label}</legend>
          <div className="flex flex-wrap gap-2">
            {group.options.map((option) => {
              const isSelected = (selection[group.key] ?? []).includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onToggle(group, option.value)}
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
    </>
  );
}

export function ActiveFilterChips({
  filters,
  onRemove,
  onClear,
}: {
  filters: ActiveFilter[];
  onRemove: (filter: ActiveFilter) => void;
  onClear: () => void;
}) {
  if (filters.length === 0) return null;

  return (
    <>
      {filters.map((filter) => (
        <button
          key={`${filter.groupKey}-${filter.value}`}
          type="button"
          onClick={() => onRemove(filter)}
          aria-label={`Remove filter ${filter.label}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-border/60"
        >
          {filter.label}
          <FiX size={12} />
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="text-xs font-semibold text-muted underline-offset-2 hover:text-primary hover:underline"
      >
        Clear all
      </button>
    </>
  );
}
