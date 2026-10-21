import "server-only";
import { notFound } from "next/navigation";
import { ENDPOINTS, isUuid } from "@/lib/api/endpoints";
import type { AdminIssue, AdminRefund, AdminRefundRequest, AdminWithdrawal, Attention, Diagnostics, Readiness } from "@/lib/api/schemas";
import { ApiError } from "@/lib/api/errors";
import { callWithSession } from "@/lib/auth/api-session";
import { cursorOf, guarded, list, pick } from "./server";
import type { Page } from "./server";

const one = (raw: Record<string, string | string[] | undefined>, key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : undefined);

// ---- refund review requests -------------------------------------------------------------------------------------------------------
export const REFUND_REQUEST_STATUSES = ["requested", "accepted", "rejected", "withdrawn"] as const;
export const REFUND_FOLLOW_UPS = ["awaiting_refund", "refund_pending", "refund_completed", "not_refundable"] as const;

export interface RefundRequestQuery {
  status?: (typeof REFUND_REQUEST_STATUSES)[number];
  followUp?: (typeof REFUND_FOLLOW_UPS)[number];
  needsAction?: boolean;
  cursor?: string;
}

export function parseRefundRequestQuery(raw: Record<string, string | string[] | undefined>): RefundRequestQuery {
  const status = pick(REFUND_REQUEST_STATUSES, one(raw, "status"));
  const followUp = pick(REFUND_FOLLOW_UPS, one(raw, "followUp"));
  const cursor = cursorOf(one(raw, "cursor"));
  return { ...(status ? { status } : {}), ...(followUp ? { followUp } : {}), ...(one(raw, "needsAction") === "true" ? { needsAction: true } : {}), ...(cursor ? { cursor } : {}) };
}

export function loadRefundRequests(query: RefundRequestQuery): Promise<Page<AdminRefundRequest>> {
  return list("/admin/refund-requests", ENDPOINTS.adminRefundRequests, { ...(query.status ? { status: query.status } : {}), ...(query.followUp ? { followUp: query.followUp } : {}), ...(query.needsAction ? { needsAction: "true" } : {}), ...(query.cursor ? { cursor: query.cursor } : {}) });
}

export async function loadRefundRequest(id: string): Promise<AdminRefundRequest> {
  if (!isUuid(id)) notFound();
  return guarded(`/admin/refund-requests/${id}`, async () => (await callWithSession(ENDPOINTS.adminRefundRequest, undefined, { id })).data.request);
}

// ---- refunds ----------------------------------------------------------------------------------------------------------------------
export const REFUND_STATUSES = ["pending", "completed", "cancelled"] as const;

export interface RefundQuery {
  status?: (typeof REFUND_STATUSES)[number];
  cursor?: string;
}

export function parseRefundQuery(raw: Record<string, string | string[] | undefined>): RefundQuery {
  const status = pick(REFUND_STATUSES, one(raw, "status"));
  const cursor = cursorOf(one(raw, "cursor"));
  return { ...(status ? { status } : {}), ...(cursor ? { cursor } : {}) };
}

export function loadRefunds(query: RefundQuery): Promise<Page<AdminRefund>> {
  return list("/admin/refunds", ENDPOINTS.adminRefunds, { ...(query.status ? { status: query.status } : {}), ...(query.cursor ? { cursor: query.cursor } : {}) });
}

export async function loadRefund(id: string): Promise<AdminRefund> {
  if (!isUuid(id)) notFound();
  return guarded(`/admin/refunds/${id}`, async () => (await callWithSession(ENDPOINTS.adminRefund, undefined, { id })).data.refund);
}

// ---- withdrawal review ------------------------------------------------------------------------------------------------------------
export const WITHDRAWAL_STATUSES = ["requested", "under_review", "approved", "rejected", "cancelled", "processing", "completed", "failed"] as const;

export interface WithdrawalQuery {
  status?: (typeof WITHDRAWAL_STATUSES)[number];
  needsReview?: boolean;
  cursor?: string;
}

export function parseWithdrawalQuery(raw: Record<string, string | string[] | undefined>): WithdrawalQuery {
  const status = pick(WITHDRAWAL_STATUSES, one(raw, "status"));
  const cursor = cursorOf(one(raw, "cursor"));
  return { ...(status ? { status } : {}), ...(one(raw, "needsReview") === "true" ? { needsReview: true } : {}), ...(cursor ? { cursor } : {}) };
}

export function loadWithdrawals(query: WithdrawalQuery): Promise<Page<AdminWithdrawal>> {
  return list("/admin/withdrawals", ENDPOINTS.adminWithdrawals, { ...(query.status ? { status: query.status } : {}), ...(query.needsReview ? { needsReview: "true" } : {}), ...(query.cursor ? { cursor: query.cursor } : {}) });
}

export async function loadWithdrawal(id: string): Promise<AdminWithdrawal> {
  if (!isUuid(id)) notFound();
  return guarded(`/admin/withdrawals/${id}`, async () => (await callWithSession(ENDPOINTS.adminWithdrawal, undefined, { id })).data.withdrawal);
}

// ---- reconciliation -----------------------------------------------------------------------------------------------------------------
export interface IssueQuery {
  resolved?: boolean;
  cursor?: string;
}

/** Open issues by default (the work to do); "resolved=true" is the history. */
export function parseIssueQuery(raw: Record<string, string | string[] | undefined>): IssueQuery {
  const cursor = cursorOf(one(raw, "cursor"));
  return { resolved: one(raw, "resolved") === "true", ...(cursor ? { cursor } : {}) };
}

export function loadIssues(query: IssueQuery): Promise<Page<AdminIssue>> {
  return list("/admin/payments/issues", ENDPOINTS.adminPaymentIssues, { resolved: query.resolved ? "true" : "false", ...(query.cursor ? { cursor: query.cursor } : {}) });
}

export async function loadIssue(id: string): Promise<AdminIssue> {
  if (!isUuid(id)) notFound();
  return guarded(`/admin/reconciliation/${id}`, async () => (await callWithSession(ENDPOINTS.adminPaymentIssue, undefined, { id })).data.issue);
}

/** The finance overview reads. Each can fail on its own; a read that fails is `null` (shown as unavailable), never replaced by a guess. */
export async function loadAttention(returnTo: string): Promise<Attention | null> {
  return guarded(returnTo, async () => {
    try {
      return (await callWithSession(ENDPOINTS.adminPaymentAttention)).data.attention;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) throw error;
      return null;
    }
  });
}

export async function loadDiagnostics(): Promise<Diagnostics | null> {
  try {
    return (await callWithSession(ENDPOINTS.adminPaymentDiagnostics)).data.diagnostics;
  } catch {
    return null;
  }
}

export async function loadReadiness(): Promise<Readiness | null> {
  try {
    return (await callWithSession(ENDPOINTS.adminPaymentReadiness)).data.readiness;
  } catch {
    return null;
  }
}
