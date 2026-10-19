/**
 * Reading and writing the session cookie. The API's session value is an opaque token: it is only ever moved between the API's
 * Set-Cookie header and this application's own HttpOnly cookie, never into page data, URLs, storage or logs.
 */
export interface UpstreamSessionCookie {
  /** The token, or null when the API is clearing the cookie. */
  value: string | null;
  /** Lifetime in seconds for a persistent cookie; null for a browser-session cookie. */
  maxAgeSeconds: number | null;
}

/** Only tokens that are safe to place in a Cookie header are ever forwarded (no whitespace, separators or control characters). */
const TOKEN = /^[A-Za-z0-9._~+/=-]{16,512}$/;

export function isValidSessionToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN.test(value);
}

/** Finds the named cookie among the API's Set-Cookie headers. Other cookies are ignored. Returns null when it is not present. */
export function parseUpstreamSessionCookie(setCookies: readonly string[], name: string, now: number = Date.now()): UpstreamSessionCookie | null {
  for (const header of setCookies) {
    const [pair = "", ...attributes] = header.split(";").map((part) => part.trim());
    const separator = pair.indexOf("=");
    if (separator === -1 || pair.slice(0, separator).trim() !== name) continue;
    const rawValue = pair.slice(separator + 1).trim();

    let maxAgeSeconds: number | null = null;
    let expiresInPast = false;
    for (const attribute of attributes) {
      const [key = "", ...rest] = attribute.split("=");
      const attributeValue = rest.join("=").trim();
      const lower = key.trim().toLowerCase();
      if (lower === "max-age") {
        const seconds = Number(attributeValue);
        if (Number.isInteger(seconds)) maxAgeSeconds = seconds;
      } else if (lower === "expires") {
        const at = Date.parse(attributeValue);
        if (!Number.isNaN(at) && at <= now) expiresInPast = true;
      }
    }

    const clearing = rawValue === "" || (maxAgeSeconds !== null && maxAgeSeconds <= 0) || expiresInPast;
    if (clearing) return { value: null, maxAgeSeconds: null };
    if (!isValidSessionToken(rawValue)) return null;
    return { value: rawValue, maxAgeSeconds: maxAgeSeconds !== null && maxAgeSeconds > 0 ? maxAgeSeconds : null };
  }
  return null;
}

/** Name of THIS application's cookie in the browser. */
export const BROWSER_SESSION_COOKIE = "ioh_session";

export interface BrowserCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge?: number;
}

/** The approved attributes: HttpOnly always, Secure in production, SameSite=Lax, host-only (no Domain). */
export function browserCookieOptions(isProduction: boolean, maxAgeSeconds: number | null): BrowserCookieOptions {
  return { httpOnly: true, secure: isProduction, sameSite: "lax", path: "/", ...(maxAgeSeconds ? { maxAge: maxAgeSeconds } : {}) };
}
