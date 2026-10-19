import { parseAccountType } from "@/lib/domain/mappers";
import type { AccountStatus, AccountType, UserQuery } from "@/types/user-management";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "creator", label: "Influencers" },
  { value: "brand", label: "Brands" },
];

export const ACCOUNT_STATUSES: { value: AccountStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending approval" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
];

export const ENGAGEMENT_THRESHOLDS = [0, 2, 4, 6];

export const EMPTY_USER_QUERY: UserQuery = { q: "", type: "all", status: "all", location: "", niche: "", minEngagement: 0 };

export function parseUserQuery(params: RawSearchParams): UserQuery {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  // Saved links may still say ?type=influencer.
  const type = parseAccountType(first(params.type)) ?? "";
  const status = first(params.status);
  const minEngagement = Number(first(params.engagement));
  return {
    q: first(params.q),
    type: ACCOUNT_TYPES.some((option) => option.value === type) ? (type as AccountType) : "all",
    status: ACCOUNT_STATUSES.some((option) => option.value === status) ? (status as AccountStatus) : "all",
    location: first(params.location),
    niche: first(params.niche),
    minEngagement: ENGAGEMENT_THRESHOLDS.includes(minEngagement) ? minEngagement : 0,
  };
}

export function buildUsersHref(query: UserQuery) {
  const params = new URLSearchParams();
  if (query.q.trim()) params.set("q", query.q.trim());
  if (query.type !== "all") params.set("type", query.type);
  if (query.status !== "all") params.set("status", query.status);
  if (query.location) params.set("location", query.location);
  if (query.niche) params.set("niche", query.niche);
  if (query.minEngagement) params.set("engagement", String(query.minEngagement));
  const search = params.toString();
  return search ? `/admin/users?${search}` : "/admin/users";
}

export function isFilteredQuery(query: UserQuery) {
  return buildUsersHref(query) !== "/admin/users";
}
