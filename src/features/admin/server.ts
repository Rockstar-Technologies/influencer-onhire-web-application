import "server-only";
import { notFound, redirect } from "next/navigation";
import { ENDPOINTS, isUuid } from "@/lib/api/endpoints";
import type { Endpoint } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { AdminApplicationDetail, AdminApplicationListItem, AdminCampaignDetail, AdminCampaignListItem, AdminPayment, AdminPaymentDetail, AdminUserDetail, AdminUserListItem } from "@/lib/api/schemas";
import { callWithSession } from "@/lib/auth/api-session";
import { signInUrl } from "@/lib/auth/paths";

export const PAGE_SIZE = 20;

/** A 401 means the session ended since the page guard ran: send the person to sign in and back. A 404 or a malformed id is the same "not found" page. */
async function guarded<T>(returnTo: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(signInUrl({ next: returnTo, expired: true }));
    if (error instanceof ApiError && (error.status === 404 || (error.status === 422 && error.code === "validation_failed"))) notFound();
    throw error;
  }
}

const cursorOf = (value: unknown) => (typeof value === "string" && /^[A-Za-z0-9_=-]{1,512}$/.test(value) ? value : undefined);
const textOf = (value: unknown, max = 100) => (typeof value === "string" && value.trim().length >= 2 && value.trim().length <= max ? value.trim() : undefined);
const pick = <T extends string>(allowed: readonly T[], value: unknown): T | undefined => (typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined);

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

async function list<T>(returnTo: string, endpoint: Endpoint<T[]>, query: Record<string, string | number | undefined>): Promise<Page<T>> {
  return guarded(returnTo, async () => {
    const result = await callWithSession(endpoint, undefined, { query: { limit: PAGE_SIZE, ...query } });
    const next = result.meta?.nextCursor;
    return { items: result.data, nextCursor: typeof next === "string" ? next : null };
  });
}

// ---- users ------------------------------------------------------------------------------------------------------------------------
export const USER_ROLES = ["brand", "creator", "admin"] as const;
export const USER_STATUSES = ["pending", "active", "suspended", "rejected"] as const;
export const USER_SORTS = ["created_at", "last_active_at", "full_name", "email"] as const;

export interface UserQuery {
  q?: string;
  role?: (typeof USER_ROLES)[number];
  status?: (typeof USER_STATUSES)[number];
  flagged?: boolean;
  sort: (typeof USER_SORTS)[number];
  cursor?: string;
}

/** The query as the URL gives it: every value is checked against what the API accepts, and anything else is dropped (never forwarded). */
export function parseUserQuery(raw: Record<string, string | string[] | undefined>): UserQuery {
  const one = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : undefined);
  const q = textOf(one("q"));
  const role = pick(USER_ROLES, one("role"));
  const status = pick(USER_STATUSES, one("status"));
  const cursor = cursorOf(one("cursor"));
  return { ...(q ? { q } : {}), ...(role ? { role } : {}), ...(status ? { status } : {}), ...(one("flagged") === "true" ? { flagged: true } : {}), sort: pick(USER_SORTS, one("sort")) ?? "created_at", ...(cursor ? { cursor } : {}) };
}

export function loadUsers(query: UserQuery): Promise<Page<AdminUserListItem>> {
  return list("/admin/users", ENDPOINTS.adminUsers, { ...(query.q ? { q: query.q } : {}), ...(query.role ? { role: query.role } : {}), ...(query.status ? { status: query.status } : {}), ...(query.flagged ? { flagged: "true" } : {}), sort: query.sort, ...(query.sort === "full_name" || query.sort === "email" ? { dir: "asc" } : {}), ...(query.cursor ? { cursor: query.cursor } : {}) });
}

export async function loadUser(id: string): Promise<AdminUserDetail> {
  if (!isUuid(id)) notFound();
  return guarded(`/admin/users/${id}`, async () => (await callWithSession(ENDPOINTS.adminUser, undefined, { id })).data.user);
}

// ---- creator applications ------------------------------------------------------------------------------------------------------
export const APPLICATION_STATUSES = ["under_review", "approved", "rejected", "draft"] as const;

export interface ApplicationQuery {
  q?: string;
  status: (typeof APPLICATION_STATUSES)[number];
  cursor?: string;
}

export function parseApplicationQuery(raw: Record<string, string | string[] | undefined>): ApplicationQuery {
  const one = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : undefined);
  const q = textOf(one("q"));
  const cursor = cursorOf(one("cursor"));
  return { ...(q ? { q } : {}), status: pick(APPLICATION_STATUSES, one("status")) ?? "under_review", ...(cursor ? { cursor } : {}) };
}

export function loadApplications(query: ApplicationQuery): Promise<Page<AdminApplicationListItem>> {
  // The queue is oldest-submission first so nothing waits forever; history views are newest first.
  const queue = query.status === "under_review";
  return list("/admin/applications", ENDPOINTS.adminApplications, { status: query.status, sort: queue ? "submitted_at" : "created_at", dir: queue ? "asc" : "desc", ...(query.q ? { q: query.q } : {}), ...(query.cursor ? { cursor: query.cursor } : {}) });
}

export async function loadApplication(id: string): Promise<AdminApplicationDetail> {
  if (!isUuid(id)) notFound();
  return guarded(`/admin/applications/${id}`, async () => (await callWithSession(ENDPOINTS.adminApplication, undefined, { id })).data.application);
}

// ---- campaign review -------------------------------------------------------------------------------------------------------------
export const CAMPAIGN_REVIEW_STATUSES = ["pending_review", "open", "accepted", "in_progress", "completed", "rejected", "cancelled"] as const;

export interface CampaignReviewQuery {
  q?: string;
  status: (typeof CAMPAIGN_REVIEW_STATUSES)[number];
  cursor?: string;
}

export function parseCampaignQuery(raw: Record<string, string | string[] | undefined>): CampaignReviewQuery {
  const one = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : undefined);
  const q = textOf(one("q"));
  const cursor = cursorOf(one("cursor"));
  return { ...(q ? { q } : {}), status: pick(CAMPAIGN_REVIEW_STATUSES, one("status")) ?? "pending_review", ...(cursor ? { cursor } : {}) };
}

export function loadReviewCampaigns(query: CampaignReviewQuery): Promise<Page<AdminCampaignListItem>> {
  const queue = query.status === "pending_review";
  return list("/admin/campaigns", ENDPOINTS.adminCampaigns, { status: query.status, sort: queue ? "submitted_at" : "created_at", dir: queue ? "asc" : "desc", ...(query.q ? { q: query.q } : {}), ...(query.cursor ? { cursor: query.cursor } : {}) });
}

export async function loadReviewCampaign(id: string): Promise<AdminCampaignDetail> {
  if (!isUuid(id)) notFound();
  return guarded(`/admin/campaigns/${id}`, async () => (await callWithSession(ENDPOINTS.adminCampaign, undefined, { id })).data.campaign);
}

// ---- payments ----------------------------------------------------------------------------------------------------------------------
export const PAYMENT_STATUSES = ["held", "requested", "released", "refund_pending", "refunded"] as const;

export interface PaymentQuery {
  status?: (typeof PAYMENT_STATUSES)[number];
  releasable?: boolean;
  disputed?: boolean;
  invoice?: string;
  cursor?: string;
}

export function parsePaymentQuery(raw: Record<string, string | string[] | undefined>): PaymentQuery {
  const one = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : undefined);
  const status = pick(PAYMENT_STATUSES, one("status"));
  const invoice = /^(INV-)?\d{1,18}$/i.test((one("invoice") ?? "").trim()) ? (one("invoice") as string).trim() : undefined;
  const cursor = cursorOf(one("cursor"));
  return { ...(status ? { status } : {}), ...(one("releasable") === "true" ? { releasable: true } : {}), ...(one("disputed") === "true" ? { disputed: true } : {}), ...(invoice ? { invoice } : {}), ...(cursor ? { cursor } : {}) };
}

export function loadPayments(query: PaymentQuery): Promise<Page<AdminPayment>> {
  return list("/admin/payments", ENDPOINTS.adminPayments, { ...(query.status ? { status: query.status } : {}), ...(query.releasable ? { releasable: "true" } : {}), ...(query.disputed ? { disputed: "true" } : {}), ...(query.invoice ? { invoice: query.invoice } : {}), ...(query.cursor ? { cursor: query.cursor } : {}) });
}

export async function loadPayment(id: string): Promise<AdminPaymentDetail> {
  if (!isUuid(id)) notFound();
  return guarded(`/admin/payments/${id}`, async () => (await callWithSession(ENDPOINTS.adminPayment, undefined, { id })).data.payment);
}

// ---- overview ------------------------------------------------------------------------------------------------------------------------
export interface QueueSize {
  count: number;
  /** True when the first page was full: there may be more than `count`. */
  more: boolean;
}

/** How many items wait in a queue, counted from one page of the real list (the API has no count endpoint). A failure leaves the figure out. */
export async function queueSize<T>(endpoint: Endpoint<T[]>, query: Record<string, string | number | undefined>): Promise<QueueSize | null> {
  try {
    const result = await callWithSession(endpoint, undefined, { query: { limit: 50, ...query } });
    const next = result.meta?.nextCursor;
    return { count: result.data.length, more: typeof next === "string" };
  } catch {
    return null;
  }
}
