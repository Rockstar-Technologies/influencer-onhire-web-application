export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterGroup {
  key: string;
  label: string;
  mode: "single" | "multiple";
  options: FilterOption[];
}

export interface InfluencerSearchOptions {
  sortOptions: FilterOption[];
  filterGroups: FilterGroup[];
}

// Parsed from the browse page URL. `filters` is keyed by FilterGroup.key.
export interface InfluencerQuery {
  q: string;
  sort: string;
  filters: Record<string, string[]>;
}
