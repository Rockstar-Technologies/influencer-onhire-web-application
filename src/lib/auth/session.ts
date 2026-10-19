import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getApiConfig } from "@/lib/api/config";
import { callApi } from "@/lib/api/client";
import { resolveClientIp } from "@/lib/api/client-ip";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { BROWSER_SESSION_COOKIE, isValidSessionToken } from "@/lib/api/session-cookie";
import { knownPermissions } from "@/lib/domain/mappers";
import type { PermissionCode } from "@/lib/domain/vocabulary";
import { decideAccess } from "./access";
import type { Requirement, Session } from "./access";
import { CREATOR_APPLICATION_PATH, sanitizeNext, signInUrl } from "./paths";
import { REQUEST_PATH_HEADER } from "./request-path";

/** The client address to forward to the API, or null (see client-ip.ts). Never taken from a client-supplied value unless trusted hops are configured. */
export async function getForwardedClientIp(): Promise<string | null> {
  const hops = getApiConfig().trustedProxyHops;
  if (hops < 1) return null;
  return resolveClientIp((await headers()).get("x-forwarded-for"), hops);
}

export async function readSessionToken(): Promise<string | null> {
  const value = (await cookies()).get(BROWSER_SESSION_COOKIE)?.value;
  return isValidSessionToken(value) ? value : null;
}

/**
 * Restores the session from the API. Returns null when there is no cookie or the API says it is not valid (401/403). Any other
 * failure (API down, rate limited, malformed answer) is thrown: access is denied by the error page, never granted by default.
 * `clearInvalid` is only usable in Server Actions and Route Handlers, where cookies may be written.
 */
async function restoreSession(clearInvalid: boolean): Promise<Session | null> {
  const token = await readSessionToken();
  if (!token) return null;
  try {
    const result = await callApi(ENDPOINTS.me, { session: token, clientIp: await getForwardedClientIp() });
    return {
      user: result.data.user,
      permissions: knownPermissions(result.data.permissions ?? []),
      expiresAt: result.data.session?.expiresAt ?? null,
    };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      if (clearInvalid) (await cookies()).delete(BROWSER_SESSION_COOKIE);
      return null;
    }
    throw error;
  }
}

/** For Server Components: one `/auth/me` call per render, shared by every caller. Cannot clear a stale cookie (rendering may not write cookies). */
export const getSession = cache(() => restoreSession(false));

/** For Server Actions: same, but also deletes a cookie the API no longer accepts. */
export function getSessionForAction(): Promise<Session | null> {
  return restoreSession(true);
}

/** The page being rendered, as recorded by proxy.ts, if it passes the same-site/role-neutral checks; otherwise the caller's fallback. */
async function returnPath(fallback: string): Promise<string> {
  const recorded = (await headers()).get(REQUEST_PATH_HEADER);
  return sanitizeNext(recorded, null) ?? fallback;
}

/** Page and layout guard: anonymous users go to sign-in (with a safe `next`); other users go to the page that fits their account. */
export async function requireAccess(requirement: Requirement, next: string): Promise<Session> {
  const session = await getSession();
  const decision = decideAccess(session, requirement);
  if (decision.allowed) return session as Session;

  if (decision.reason === "anonymous") {
    // A cookie that the API no longer accepts means the session ended (expired or revoked), which the sign-in page says.
    const expired = (await readSessionToken()) !== null;
    redirect(signInUrl({ next: await returnPath(next), expired }));
  }
  if (decision.reason === "pending_creator") redirect(CREATOR_APPLICATION_PATH);
  if (decision.reason === "missing_permission") redirect("/admin?denied=permission");
  redirect(signInUrl({ denied: requirement.role }));
}

export const requireBrand = (next: string) => requireAccess({ role: "brand" }, next);
export const requireCreator = (next: string, options: { allowPending?: boolean } = {}) =>
  requireAccess({ role: "creator", ...(options.allowPending ? { allowPending: true } : {}) }, next);
export const requireAdmin = (next: string, permission?: PermissionCode) =>
  requireAccess({ role: "admin", ...(permission ? { permission } : {}) }, next);
