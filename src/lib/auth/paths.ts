import type { ApiUser } from "@/lib/api/schemas";

/** Pure helpers for where a signed-in user belongs and which redirect targets are acceptable. No server-only imports. */
export type Role = ApiUser["role"];
export type AccountSummary = Pick<ApiUser, "role" | "status">;

export const SIGN_IN_PATH = "/sign-in";
export const CREATOR_APPLICATION_PATH = "/for-creators/apply/profile";

/** Default landing page for a signed-in user. A pending creator can only do their application. */
export function homeFor(user: AccountSummary): string {
  if (user.role === "admin") return "/admin";
  if (user.role === "brand") return "/brand/payments";
  return user.status === "active" ? "/creator/requests" : CREATOR_APPLICATION_PATH;
}

/** Where a brand-new account goes right after signing up. */
export function afterSignUpFor(user: AccountSummary): string {
  return user.role === "brand" ? "/campaigns/new" : homeFor(user);
}

/** The URL prefixes each role may be sent to through `?next=`. */
const ALLOWED_PREFIXES: Record<Role, readonly string[]> = {
  brand: ["/brand", "/campaigns", "/post-campaign", "/influencers"],
  creator: ["/creator", "/for-creators"],
  admin: ["/admin"],
};

const CONTROL_OR_BACKSLASH = /[\u0000-\u001f\u007f\\]/;

function hasPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`);
}

/**
 * A `next` value is honoured only when it is a same-site relative path that this role is allowed to open. Everything else
 * (absolute URLs, `//host`, `/\host`, `javascript:`, encoded tricks, other roles' areas, the sign-in pages themselves) is refused
 * and the caller falls back to the user's home page.
 */
export function sanitizeNext(next: unknown, user: AccountSummary | null): string | null {
  if (typeof next !== "string" || next.length === 0 || next.length > 200) return null;
  if (!next.startsWith("/") || next.startsWith("//") || CONTROL_OR_BACKSLASH.test(next)) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return null;
  }
  if (decoded.startsWith("//") || CONTROL_OR_BACKSLASH.test(decoded)) return null;
  if (hasPrefix(next, SIGN_IN_PATH) || hasPrefix(next, "/login")) return null;
  if (user === null) return ALLOWED_PREFIXES.brand.concat(ALLOWED_PREFIXES.creator, ALLOWED_PREFIXES.admin).some((p) => hasPrefix(next, p)) ? next : null;
  if (user.role === "creator" && user.status !== "active") return hasPrefix(next, "/for-creators") ? next : null;
  return ALLOWED_PREFIXES[user.role].some((prefix) => hasPrefix(next, prefix)) ? next : null;
}

/** Sign-in link that carries a sanitised destination. */
export function signInUrl(params: { next?: string; denied?: "brand" | "creator" | "admin"; expired?: boolean } = {}): string {
  const query = new URLSearchParams();
  if (params.next && sanitizeNext(params.next, null)) query.set("next", params.next);
  if (params.denied) query.set("denied", params.denied);
  if (params.expired) query.set("expired", "1");
  const text = query.toString();
  return text ? `${SIGN_IN_PATH}?${text}` : SIGN_IN_PATH;
}
