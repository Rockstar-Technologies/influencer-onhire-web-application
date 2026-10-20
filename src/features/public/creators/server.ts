import "server-only";
import { notFound } from "next/navigation";
import { callApi } from "@/lib/api/client";
import { ENDPOINTS, isUsername } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { PublicCard, PublicFilters, PublicProfile } from "@/lib/api/schemas";
import { getForwardedClientIp } from "@/lib/auth/session";
import type { DirectoryQuery } from "./query";
import { toApiQuery } from "./query";

export const PAGE_SIZE = 12;
/** Names the API reserves for its own routes: they are never creators, and are not looked up as one. */
const RESERVED = new Set(["filters", "options", "search", "profile", "applications"]);

/** Public pages call the API WITHOUT a session (the endpoints take none), but still forward the visitor's address under the trusted-proxy rules, for the per-IP limiter. */
async function publicCall<T>(endpoint: Parameters<typeof callApi<T>>[0], options: Omit<Parameters<typeof callApi<T>>[1] & object, "session" | "clientIp"> = {}) {
  return callApi(endpoint, { ...options, clientIp: await getForwardedClientIp() });
}

export interface DirectoryPage {
  items: PublicCard[];
  nextCursor: string | null;
}

/** One page of approved creators matching the query. A failure is thrown to the error page: it is never shown as "no creators". */
export async function loadDirectory(query: DirectoryQuery, limit = PAGE_SIZE): Promise<DirectoryPage> {
  const result = await publicCall(ENDPOINTS.publicCreators, { query: toApiQuery(query, limit) });
  const next = result.meta?.nextCursor;
  return { items: result.data, nextCursor: typeof next === "string" ? next : null };
}

/** The "recommended" first page, for the home page. */
export function loadFeatured(count = 6): Promise<DirectoryPage> {
  return loadDirectory({ q: "", sort: "recommended", filters: {} }, count);
}

export async function loadFilters(): Promise<PublicFilters> {
  return (await publicCall(ENDPOINTS.publicCreatorFilters)).data;
}

/**
 * One public profile. An unknown username, a creator who is not (or no longer) public, a reserved name and a username of the wrong shape all end in the
 * same "not found" page, and the last two never reach the API. Any other failure is thrown to the error page, not shown as "not found".
 */
export async function loadPublicProfile(username: string): Promise<PublicProfile> {
  if (!isUsername(username) || RESERVED.has(username.toLowerCase())) notFound();
  try {
    return (await publicCall(ENDPOINTS.publicCreator, { params: { username } })).data.creator;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) notFound();
    throw error;
  }
}
