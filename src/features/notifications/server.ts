import "server-only";
import { redirect } from "next/navigation";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { NotificationView } from "@/lib/api/schemas";
import { callWithSession } from "@/lib/auth/api-session";
import { signInUrl } from "@/lib/auth/paths";
import type { NotificationArea } from "./mapping";

export const PAGE_SIZE = 20;
export const notificationsPath = (area: NotificationArea) => `/${area}/notifications`;

export interface NotificationPage {
  items: NotificationView[];
  nextCursor: string | null;
  unreadOnly: boolean;
  unread: number;
}

/** One page of the signed-in person's notifications (the API scopes them to the session), with the current unread count. A 401 sends the person to sign in and back. */
export async function loadNotifications(area: NotificationArea, input: { unread?: boolean; cursor?: string }): Promise<NotificationPage> {
  const unreadOnly = input.unread === true;
  const cursor = typeof input.cursor === "string" && /^[A-Za-z0-9_=-]{1,512}$/.test(input.cursor) ? input.cursor : undefined;
  try {
    const [list, count] = await Promise.all([
      callWithSession(ENDPOINTS.notifications, undefined, { query: { limit: PAGE_SIZE, ...(unreadOnly ? { unread: "true" } : {}), ...(cursor ? { cursor } : {}) } }),
      callWithSession(ENDPOINTS.notificationUnreadCount),
    ]);
    const next = list.meta?.nextCursor;
    return { items: list.data, nextCursor: typeof next === "string" ? next : null, unreadOnly, unread: count.data.unread };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(signInUrl({ next: notificationsPath(area), expired: true }));
    throw error;
  }
}

/**
 * The unread count for the header bell. It must never break the page around it: any failure (API down, rate limit, ended session) hides the badge
 * instead of throwing, because the page itself is guarded and handles an ended session on its own.
 */
export async function loadUnreadCount(): Promise<number | null> {
  try {
    return (await callWithSession(ENDPOINTS.notificationUnreadCount)).data.unread;
  } catch {
    return null;
  }
}
