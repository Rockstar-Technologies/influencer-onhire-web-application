import { z } from "zod";
import type { ZodType } from "zod";
import {
  adminApplicationEnvelopeSchema,
  adminApplicationListSchema,
  adminCampaignEnvelopeSchema,
  adminCampaignListSchema,
  adminPaymentEnvelopeSchema,
  adminPaymentListSchema,
  adminUserEnvelopeSchema,
  adminUserListSchema,
  applicationOptionsSchema,
  applicationStateSchema,
  authUserDataSchema,
  campaignDeleteSchema,
  campaignEnvelopeSchema,
  campaignListSchema,
  campaignOptionsSchema,
  declineReasonsSchema,
  fundResultSchema,
  fundingEnvelopeSchema,
  emptyDataSchema,
  hireCreatorSchema,
  markAllReadResultSchema,
  markReadResultSchema,
  notificationListSchema,
  meDataSchema,
  offerEnvelopeSchema,
  offerListSchema,
  paymentListSchema,
  unreadCountSchema,
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
   * allowed are segments written `:id` (filled with a UUID) or `:username` (filled with a creator username of 3-30 letters, digits, dots and
   * underscores); the client validates both (never free text).
   */
  readonly path: string;
  /** The only query-string keys this operation may send (list filters and paging). Anything else is refused. */
  readonly query?: readonly string[];
  /** True for operations that REQUIRE an `Idempotency-Key` (money-moving requests): the client sends it, in this header only, and refuses a call without a valid one. */
  readonly idempotent?: boolean;
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

  // Offers, invitations and direct hires (backend docs/DIRECT_HIRING.md, CAMPAIGN_DISCOVERY_OFFERS.md, PLATFORM_INVITATIONS.md). Identity always comes from the session.
  creatorOffers: endpoint({ name: "creatorOffers", method: "GET", path: "/creator/offers", query: ["status", "sort", "dir", "limit", "cursor"], auth: "session", schema: offerListSchema }),
  creatorOffer: endpoint({ name: "creatorOffer", method: "GET", path: "/creator/offers/:id", auth: "session", schema: offerEnvelopeSchema }),
  declineReasons: endpoint({ name: "declineReasons", method: "GET", path: "/creator/offers/decline-reasons", auth: "session", schema: declineReasonsSchema }),
  creatorOfferAccept: endpoint({ name: "creatorOfferAccept", method: "POST", path: "/creator/offers/:id/accept", auth: "session", schema: offerEnvelopeSchema }),
  creatorOfferDecline: endpoint({ name: "creatorOfferDecline", method: "POST", path: "/creator/offers/:id/decline", auth: "session", schema: offerEnvelopeSchema }),
  brandOffers: endpoint({ name: "brandOffers", method: "GET", path: "/brand/offers", query: ["status", "sort", "dir", "limit", "cursor"], auth: "session", schema: offerListSchema }),
  brandOffer: endpoint({ name: "brandOffer", method: "GET", path: "/brand/offers/:id", auth: "session", schema: offerEnvelopeSchema }),
  brandHire: endpoint({ name: "brandHire", method: "POST", path: "/brand/offers", auth: "session", schema: offerEnvelopeSchema }),
  brandOfferAccept: endpoint({ name: "brandOfferAccept", method: "POST", path: "/brand/offers/:id/accept", auth: "session", schema: offerEnvelopeSchema }),
  brandOfferDecline: endpoint({ name: "brandOfferDecline", method: "POST", path: "/brand/offers/:id/decline", auth: "session", schema: offerEnvelopeSchema }),
  brandOfferCancel: endpoint({ name: "brandOfferCancel", method: "POST", path: "/brand/offers/:id/cancel", auth: "session", schema: offerEnvelopeSchema }),
  hireCreator: endpoint({ name: "hireCreator", method: "GET", path: "/creators/:username", auth: "session", schema: hireCreatorSchema }),

  // In-app notifications (backend docs/NOTIFICATIONS.md): the signed-in user's own rows only; no user id is ever sent.
  notifications: endpoint({ name: "notifications", method: "GET", path: "/notifications", query: ["unread", "cursor", "limit"], auth: "session", schema: notificationListSchema }),
  notificationUnreadCount: endpoint({ name: "notificationUnreadCount", method: "GET", path: "/notifications/unread-count", auth: "session", schema: unreadCountSchema }),
  notificationRead: endpoint({ name: "notificationRead", method: "POST", path: "/notifications/:id/read", auth: "session", schema: markReadResultSchema }),
  notificationsReadAll: endpoint({ name: "notificationsReadAll", method: "POST", path: "/notifications/read-all", auth: "session", schema: markAllReadResultSchema }),

  // Escrow funding of an accepted offer (backend docs/PAYMENTS_FUNDING.md). The amount is always the offer's price, read by the API: it is never sent.
  brandFund: endpoint({ name: "brandFund", method: "POST", path: "/brand/offers/:id/fund", auth: "session", idempotent: true, schema: fundResultSchema }),
  brandFunding: endpoint({ name: "brandFunding", method: "GET", path: "/brand/offers/:id/funding", auth: "session", schema: fundingEnvelopeSchema }),
  brandPayments: endpoint({ name: "brandPayments", method: "GET", path: "/brand/payments", query: ["status", "cursor", "limit"], auth: "session", schema: paymentListSchema }),

  // Administration (every route needs an explicit permission, checked by the API): users, creator applications, campaign review, payments.
  adminUsers: endpoint({ name: "adminUsers", method: "GET", path: "/admin/users", query: ["q", "role", "status", "flagged", "sort", "dir", "limit", "cursor"], auth: "session", schema: adminUserListSchema }),
  adminUser: endpoint({ name: "adminUser", method: "GET", path: "/admin/users/:id", auth: "session", schema: adminUserEnvelopeSchema }),
  adminUserSuspend: endpoint({ name: "adminUserSuspend", method: "POST", path: "/admin/users/:id/suspend", auth: "session", schema: adminUserEnvelopeSchema }),
  adminUserReactivate: endpoint({ name: "adminUserReactivate", method: "POST", path: "/admin/users/:id/reactivate", auth: "session", schema: adminUserEnvelopeSchema }),
  adminUserReject: endpoint({ name: "adminUserReject", method: "POST", path: "/admin/users/:id/reject", auth: "session", schema: adminUserEnvelopeSchema }),
  adminApplications: endpoint({ name: "adminApplications", method: "GET", path: "/admin/creator-applications", query: ["q", "status", "sort", "dir", "limit", "cursor"], auth: "session", schema: adminApplicationListSchema }),
  adminApplication: endpoint({ name: "adminApplication", method: "GET", path: "/admin/creator-applications/:id", auth: "session", schema: adminApplicationEnvelopeSchema }),
  adminApplicationApprove: endpoint({ name: "adminApplicationApprove", method: "POST", path: "/admin/creator-applications/:id/approve", auth: "session", schema: z.unknown() }),
  adminApplicationReject: endpoint({ name: "adminApplicationReject", method: "POST", path: "/admin/creator-applications/:id/reject", auth: "session", schema: z.unknown() }),
  adminCampaigns: endpoint({ name: "adminCampaigns", method: "GET", path: "/admin/campaigns", query: ["q", "status", "sort", "dir", "limit", "cursor"], auth: "session", schema: adminCampaignListSchema }),
  adminCampaign: endpoint({ name: "adminCampaign", method: "GET", path: "/admin/campaigns/:id", auth: "session", schema: adminCampaignEnvelopeSchema }),
  adminCampaignApprove: endpoint({ name: "adminCampaignApprove", method: "POST", path: "/admin/campaigns/:id/approve", auth: "session", schema: z.unknown() }),
  adminCampaignReject: endpoint({ name: "adminCampaignReject", method: "POST", path: "/admin/campaigns/:id/reject", auth: "session", schema: z.unknown() }),
  adminPayments: endpoint({ name: "adminPayments", method: "GET", path: "/admin/payments", query: ["status", "disputed", "releasable", "invoice", "dir", "limit", "cursor"], auth: "session", schema: adminPaymentListSchema }),
  adminPayment: endpoint({ name: "adminPayment", method: "GET", path: "/admin/payments/:id", auth: "session", schema: adminPaymentEnvelopeSchema }),
  adminPaymentRelease: endpoint({ name: "adminPaymentRelease", method: "POST", path: "/admin/payments/:id/release", auth: "session", schema: z.unknown() }),

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
  const plain = path.replace(/\/:(?:id|username)(?=\/|$)/g, "/x");
  return /^\/[A-Za-z0-9/_-]*$/.test(plain) && !plain.includes("//") && !plain.split("/").some((segment) => segment === "." || segment === "..");
}

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,100}$/;

/** True for a key the API accepts: 8-100 letters, digits, hyphens and underscores. */
export function isIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && IDEMPOTENCY_KEY.test(value);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True for a UUID: the only value an `:id` segment may take. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

const USERNAME = /^[A-Za-z0-9._]{3,30}$/;

/** True for a creator username as the API defines it: the only value a `:username` segment may take. */
export function isUsername(value: unknown): value is string {
  return typeof value === "string" && USERNAME.test(value) && !/^\.+$/.test(value);
}

/** Fills the `:id` / `:username` segment of an operation's path. A value of the wrong shape is refused before anything is sent. */
export function buildApiPath(endpoint: Pick<Endpoint<unknown>, "path">, params: { id?: string; username?: string } = {}): string {
  let path = endpoint.path;
  if (path.includes(":id")) {
    if (typeof params.id !== "string" || !UUID.test(params.id)) throw new ApiConfigError("The identifier is not valid");
    path = path.replace(":id", params.id.toLowerCase());
  } else if (params.id !== undefined) {
    throw new ApiConfigError("This API operation takes no identifier");
  }
  if (path.includes(":username")) {
    if (!isUsername(params.username)) throw new ApiConfigError("The username is not valid");
    path = path.replace(":username", params.username);
  } else if (params.username !== undefined) {
    throw new ApiConfigError("This API operation takes no username");
  }
  return path;
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
