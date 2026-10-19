import type { ZodType } from "zod";
import {
  applicationOptionsSchema,
  applicationStateSchema,
  authUserDataSchema,
  campaignDeleteSchema,
  campaignEnvelopeSchema,
  campaignListSchema,
  campaignOptionsSchema,
  emptyDataSchema,
  meDataSchema,
  reapplyResultSchema,
  submitResultSchema,
} from "./schemas";
import type { MeData } from "./schemas";
import { ApiConfigError } from "./errors";

/**
 * The ONLY API operations this application may perform. The client accepts an object from this table and nothing else, so the path,
 * method and expected response shape are fixed in code: a caller cannot pass a URL, a path or a method. Add an entry here (with the
 * backend route verified against its source) before using a new API operation.
 */
export interface Endpoint<TData> {
  readonly name: string;
  readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /**
   * Path below the API base URL: a fixed string beginning with "/", containing no dot segments, "//", "?" or "#". The only variable part
   * allowed is a segment written `:id`, which is filled with a UUID that the client validates (never free text).
   */
  readonly path: string;
  /** The only query-string keys this operation may send (list filters and paging). Anything else is refused. */
  readonly query?: readonly string[];
  readonly auth: "none" | "session";
  readonly schema: ZodType<TData>;
}

function endpoint<T>(def: Endpoint<T>): Endpoint<T> {
  return Object.freeze({ ...def });
}

export const ENDPOINTS = {
  register: endpoint({ name: "register", method: "POST", path: "/auth/register", auth: "none", schema: authUserDataSchema }),
  login: endpoint({ name: "login", method: "POST", path: "/auth/login", auth: "none", schema: authUserDataSchema }),
  me: endpoint({ name: "me", method: "GET", path: "/auth/me", auth: "session", schema: meDataSchema }),
  logout: endpoint({ name: "logout", method: "POST", path: "/auth/logout", auth: "session", schema: emptyDataSchema }),

  // Creator application wizard (backend docs/CREATOR_APPLICATION_WIZARD.md). Every route derives the creator from the session: no id is ever sent.
  applicationOptions: endpoint({ name: "applicationOptions", method: "GET", path: "/creator/applications/options", auth: "session", schema: applicationOptionsSchema }),
  applicationCurrent: endpoint({ name: "applicationCurrent", method: "GET", path: "/creator/applications/current", auth: "session", schema: applicationStateSchema }),
  applicationSaveProfile: endpoint({ name: "applicationSaveProfile", method: "PUT", path: "/creator/applications/current/profile", auth: "session", schema: applicationStateSchema }),
  applicationSaveAudience: endpoint({ name: "applicationSaveAudience", method: "PUT", path: "/creator/applications/current/audience", auth: "session", schema: applicationStateSchema }),
  applicationSaveRates: endpoint({ name: "applicationSaveRates", method: "PUT", path: "/creator/applications/current/rates", auth: "session", schema: applicationStateSchema }),
  applicationSubmit: endpoint({ name: "applicationSubmit", method: "POST", path: "/creator/applications/current/submit", auth: "session", schema: submitResultSchema }),
  // Brand campaigns (backend docs/CAMPAIGN_MANAGEMENT.md). The owner is always the session brand; `:id` is the campaign's UUID.
  campaignOptions: endpoint({ name: "campaignOptions", method: "GET", path: "/brand/campaigns/options", auth: "session", schema: campaignOptionsSchema }),
  campaignList: endpoint({ name: "campaignList", method: "GET", path: "/brand/campaigns", query: ["status", "niche", "q", "sort", "dir", "limit", "cursor"], auth: "session", schema: campaignListSchema }),
  campaignGet: endpoint({ name: "campaignGet", method: "GET", path: "/brand/campaigns/:id", auth: "session", schema: campaignEnvelopeSchema }),
  campaignCreate: endpoint({ name: "campaignCreate", method: "POST", path: "/brand/campaigns", auth: "session", schema: campaignEnvelopeSchema }),
  campaignUpdate: endpoint({ name: "campaignUpdate", method: "PATCH", path: "/brand/campaigns/:id", auth: "session", schema: campaignEnvelopeSchema }),
  campaignDelete: endpoint({ name: "campaignDelete", method: "DELETE", path: "/brand/campaigns/:id", auth: "session", schema: campaignDeleteSchema }),
  campaignSubmit: endpoint({ name: "campaignSubmit", method: "POST", path: "/brand/campaigns/:id/submit", auth: "session", schema: campaignEnvelopeSchema }),
  campaignCancel: endpoint({ name: "campaignCancel", method: "POST", path: "/brand/campaigns/:id/cancel", auth: "session", schema: campaignEnvelopeSchema }),

  applicationReapply: endpoint({ name: "applicationReapply", method: "POST", path: "/creator/applications/reapply", auth: "session", schema: reapplyResultSchema }),
} as const;

export type EndpointName = keyof typeof ENDPOINTS;
export type MeResponse = MeData;

const KNOWN: ReadonlySet<Endpoint<unknown>> = new Set(Object.values(ENDPOINTS) as Endpoint<unknown>[]);

/** True only for the exact frozen objects above (a structurally identical copy is rejected). */
export function isAllowedEndpoint(candidate: unknown): candidate is Endpoint<unknown> {
  return KNOWN.has(candidate as Endpoint<unknown>);
}

/** Defence in depth: even a table entry must be a plain absolute path with no traversal or authority tricks. */
export function isSafeApiPath(path: string): boolean {
  const plain = path.replace(/\/:id(?=\/|$)/g, "/x");
  return /^\/[A-Za-z0-9/_-]*$/.test(plain) && !plain.includes("//") && !plain.split("/").some((segment) => segment === "." || segment === "..");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True for a UUID: the only value an `:id` segment may take. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** Fills the `:id` segment of an operation's path. A value that is not a UUID is refused before anything is sent. */
export function buildApiPath(endpoint: Pick<Endpoint<unknown>, "path">, params: { id?: string } = {}): string {
  if (!endpoint.path.includes(":id")) {
    if (params.id !== undefined) throw new ApiConfigError("This API operation takes no identifier");
    return endpoint.path;
  }
  if (typeof params.id !== "string" || !UUID.test(params.id)) throw new ApiConfigError("The identifier is not valid");
  return endpoint.path.replace(":id", params.id.toLowerCase());
}

/** Builds the query string from the keys the operation allows; a key it does not list, or an unreasonable value, is refused. */
export function buildApiQuery(endpoint: Pick<Endpoint<unknown>, "query">, query: Record<string, string | number | undefined> = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") continue;
    if (!endpoint.query?.includes(key)) throw new ApiConfigError("This query parameter is not allowed");
    const text = String(value);
    if (text.length > 300) throw new ApiConfigError("A query value is too long");
    search.set(key, text);
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
