import type { ZodType } from "zod";
import {
  applicationOptionsSchema,
  applicationStateSchema,
  authUserDataSchema,
  emptyDataSchema,
  meDataSchema,
  reapplyResultSchema,
  submitResultSchema,
} from "./schemas";
import type { MeData } from "./schemas";

/**
 * The ONLY API operations this application may perform. The client accepts an object from this table and nothing else, so the path,
 * method and expected response shape are fixed in code: a caller cannot pass a URL, a path or a method. Add an entry here (with the
 * backend route verified against its source) before using a new API operation.
 */
export interface Endpoint<TData> {
  readonly name: string;
  readonly method: "GET" | "POST" | "PUT";
  /** Path below the API base URL: a fixed string beginning with "/", containing no dot segments, "//", "?" or "#". */
  readonly path: string;
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
  return /^\/[A-Za-z0-9/_-]*$/.test(path) && !path.includes("//") && !path.split("/").some((segment) => segment === "." || segment === "..");
}
