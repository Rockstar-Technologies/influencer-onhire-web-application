import { describe, expect, it } from "vitest";
import { browserCookieOptions, isValidSessionToken, parseUpstreamSessionCookie } from "@/lib/api/session-cookie";

const TOKEN = "AbCdEf0123456789_-AbCdEf0123456789";

describe("parseUpstreamSessionCookie", () => {
  it("reads a browser-session cookie (no Max-Age)", () => {
    expect(parseUpstreamSessionCookie([`ioh_session=${TOKEN}; Path=/; HttpOnly; SameSite=Lax`], "ioh_session")).toEqual({ value: TOKEN, maxAgeSeconds: null });
  });

  it("reads a persistent cookie and keeps its lifetime", () => {
    expect(parseUpstreamSessionCookie([`ioh_session=${TOKEN}; Max-Age=2592000; Path=/; HttpOnly`], "ioh_session")).toEqual({ value: TOKEN, maxAgeSeconds: 2_592_000 });
  });

  it("recognises the API clearing the cookie (empty value, epoch expiry, zero Max-Age)", () => {
    const cleared = { value: null, maxAgeSeconds: null };
    expect(parseUpstreamSessionCookie(["ioh_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly"], "ioh_session")).toEqual(cleared);
    expect(parseUpstreamSessionCookie([`ioh_session=${TOKEN}; Max-Age=0`], "ioh_session")).toEqual(cleared);
  });

  it("ignores other cookies and returns null when the session cookie is absent", () => {
    expect(parseUpstreamSessionCookie(["tracking=abc; Path=/", "other=zzz"], "ioh_session")).toBeNull();
    expect(parseUpstreamSessionCookie([], "ioh_session")).toBeNull();
  });

  it("finds the session cookie among several Set-Cookie headers", () => {
    expect(parseUpstreamSessionCookie(["a=1", `ioh_session=${TOKEN}; Path=/`], "ioh_session")?.value).toBe(TOKEN);
  });

  it.each(["short", "has space token 0123456789", "semi;colon0123456789", "new\r\nline0123456789", "x".repeat(513)])(
    "refuses a malformed token %#",
    (bad) => {
      expect(parseUpstreamSessionCookie([`ioh_session=${bad}; Path=/`], "ioh_session")).toBeNull();
      expect(isValidSessionToken(bad)).toBe(false);
    },
  );

  it("matches the cookie name exactly", () => {
    expect(parseUpstreamSessionCookie([`xioh_session=${TOKEN}`], "ioh_session")).toBeNull();
  });
});

describe("browserCookieOptions", () => {
  it("is HttpOnly, SameSite=Lax, host-only (no domain) and Path=/", () => {
    const options = browserCookieOptions(false, null);
    expect(options).toEqual({ httpOnly: true, secure: false, sameSite: "lax", path: "/" });
    expect(options).not.toHaveProperty("domain");
  });

  it("is Secure in production and sets maxAge only for persistent sessions", () => {
    expect(browserCookieOptions(true, null).secure).toBe(true);
    expect(browserCookieOptions(true, null)).not.toHaveProperty("maxAge");
    expect(browserCookieOptions(true, 3600).maxAge).toBe(3600);
  });
});

describe("isValidSessionToken", () => {
  it("accepts a normal opaque token and rejects non-strings", () => {
    expect(isValidSessionToken(TOKEN)).toBe(true);
    expect(isValidSessionToken(undefined)).toBe(false);
    expect(isValidSessionToken(12345)).toBe(false);
  });
});
