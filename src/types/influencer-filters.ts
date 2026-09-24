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
