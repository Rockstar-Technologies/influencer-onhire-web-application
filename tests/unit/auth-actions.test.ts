import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiConfigForTests } from "@/lib/api/config";
import { TEST_CONFIG, TOKEN, apiUser, errorBody, fakeFetch, jsonResponse, sessionCookie } from "../helpers";
import { RedirectSignal, nextState, redirectTarget, resetNextState } from "../mocks/next";

vi.mock("next/headers", async () => (await import("../mocks/next")).headersModule);
vi.mock("next/navigation", async () => (await import("../mocks/next")).navigationModule);
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

const { signInAction, signOutAction, signUpAction } = await import("@/features/auth/actions");

const STRONG = { email: "Brand@Example.com ", password: "Passw0rdtest", remember: false };
const SIGN_UP = { accountType: "brand", fullName: "Test Brand", email: "brand@example.com", phone: "670000001", password: "Passw0rdtest", acceptTerms: true } as const;

function stubUpstream(...answers: Parameters<typeof fakeFetch>) {
  const upstream = fakeFetch(...answers);
  vi.stubGlobal("fetch", upstream.fetch);
  return upstream;
}

beforeEach(() => {
  resetNextState();
  resetApiConfigForTests();
  vi.stubEnv("API_BASE_URL", TEST_CONFIG.baseUrl);
  vi.stubEnv("TRUSTED_PROXY_HOPS", "0");
});

describe("signInAction", () => {
  it("signs a brand in: sends normalised credentials, stores the cookie and redirects to the brand home", async () => {
    const upstream = stubUpstream(jsonResponse(200, { data: { user: apiUser() } }, { "set-cookie": sessionCookie() }));
    const result = await signInAction(STRONG);

    expect(result).toEqual({ ok: true, redirectTo: "/brand/payments" });
    expect(JSON.parse(String(upstream.calls[0]!.init.body))).toEqual({ email: "brand@example.com", password: "Passw0rdtest", remember: false });
    expect(upstream.calls[0]!.url).toBe("http://api.test/api/v1/auth/login");
    expect(nextState.writes).toEqual([{ name: "ioh_session", value: TOKEN, options: { httpOnly: true, secure: false, sameSite: "lax", path: "/" } }]);
  });

  it("keeps a persistent cookie lifetime only for 'remember me'", async () => {
    stubUpstream(jsonResponse(200, { data: { user: apiUser() } }, { "set-cookie": sessionCookie(TOKEN, "; Max-Age=2592000") }));
    await signInAction({ ...STRONG, remember: true });
    expect(nextState.writes[0]!.options).toMatchObject({ httpOnly: true, maxAge: 2_592_000 });
  });

  it("marks the cookie Secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", "https://app.example.com");
    vi.stubEnv("API_BASE_URL", "https://api.example.com/api/v1");
    resetApiConfigForTests();
    stubUpstream(jsonResponse(200, { data: { user: apiUser() } }, { "set-cookie": sessionCookie() }));
    await signInAction(STRONG);
    expect(nextState.writes[0]!.options).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    expect(nextState.writes[0]!.options).not.toHaveProperty("domain");
  });

  it.each([
    [{ role: "creator", status: "active" }, "/creator/requests"],
    [{ role: "creator", status: "pending", restricted: true }, "/for-creators/apply/profile"],
    [{ role: "admin", status: "active", phone: null }, "/admin"],
  ])("redirects %j to its own home", async (user, target) => {
    stubUpstream(jsonResponse(200, { data: { user: apiUser(user) } }, { "set-cookie": sessionCookie() }));
    expect(await signInAction(STRONG)).toEqual({ ok: true, redirectTo: target });
  });

  it("honours a safe `next` for the user's role and refuses an unsafe one", async () => {
    stubUpstream(jsonResponse(200, { data: { user: apiUser() } }, { "set-cookie": sessionCookie() }));
    expect(await signInAction(STRONG, "/campaigns/new")).toEqual({ ok: true, redirectTo: "/campaigns/new" });
    for (const evil of ["https://evil.example", "//evil.example", "/admin/users", "/\\evil.example"]) {
      expect(await signInAction(STRONG, evil)).toEqual({ ok: true, redirectTo: "/brand/payments" });
    }
  });

  it("maps wrong credentials without revealing which field was wrong, and writes no cookie", async () => {
    stubUpstream(jsonResponse(401, errorBody("invalid_credentials", "Email or password is incorrect")));
    expect(await signInAction(STRONG)).toEqual({ ok: false, error: { kind: "invalid_credentials" } });
    expect(nextState.writes).toHaveLength(0);
  });

  it("maps a rate limit with the wait time", async () => {
    stubUpstream(jsonResponse(429, errorBody("rate_limited"), { "retry-after": "600" }));
    expect(await signInAction(STRONG)).toEqual({ ok: false, error: { kind: "rate_limited", retryAfterSeconds: 600 } });
  });

  it.each(["account_suspended", "account_rejected"])("shows the account notice for %s", async (code) => {
    stubUpstream(jsonResponse(403, errorBody(code, "This account has been blocked.")));
    expect(await signInAction(STRONG)).toEqual({ ok: false, error: { kind: "account_blocked", message: "This account has been blocked." } });
  });

  it("reports an unavailable service for network errors, 5xx and malformed answers, with no cookie", async () => {
    for (const answer of [new TypeError("fetch failed"), jsonResponse(500, errorBody("internal_error")), jsonResponse(200, { nodata: 1 })]) {
      stubUpstream(answer);
      const result = await signInAction(STRONG);
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error.kind).toBe("unavailable");
    }
    expect(nextState.writes).toHaveLength(0);
  });

  it("does not call the API for input that cannot be valid", async () => {
    const upstream = stubUpstream(jsonResponse(200, { data: { user: apiUser() } }));
    for (const bad of [null, {}, { email: "nope", password: "x" }, { email: "a@b.cc", password: "" }, { email: "a@b.cc", password: "x".repeat(200) }]) {
      expect((await signInAction(bad)).ok).toBe(false);
    }
    expect(upstream.calls).toHaveLength(0);
  });

  it("does not store a cookie when the API answers success without one", async () => {
    stubUpstream(jsonResponse(200, { data: { user: apiUser() } }));
    const result = await signInAction(STRONG);
    expect(result).toEqual({ ok: false, error: { kind: "unavailable", requestId: expect.any(String) } });
    expect(nextState.writes).toHaveLength(0);
  });

  it("never returns the token or password to the browser", async () => {
    stubUpstream(jsonResponse(200, { data: { user: apiUser() } }, { "set-cookie": sessionCookie() }));
    const result = await signInAction(STRONG);
    expect(JSON.stringify(result)).not.toMatch(/AbCdEf0123456789|Passw0rdtest/);
  });
});

describe("client address forwarding (rate-limit correctness through the BFF)", () => {
  it("forwards nothing when no trusted proxy is configured, even if the client sent X-Forwarded-For", async () => {
    nextState.headers.set("x-forwarded-for", "6.6.6.6");
    const upstream = stubUpstream(jsonResponse(401, errorBody("invalid_credentials")));
    await signInAction(STRONG);
    expect(upstream.calls[0]!.headers["X-Forwarded-For"]).toBeUndefined();
  });

  it("forwards only the address the trusted proxy appended, never a client-supplied one", async () => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
    resetApiConfigForTests();
    nextState.headers.set("x-forwarded-for", "6.6.6.6, 203.0.113.9");
    const upstream = stubUpstream(jsonResponse(401, errorBody("invalid_credentials")));
    await signInAction(STRONG);
    expect(upstream.calls[0]!.headers["X-Forwarded-For"]).toBe("203.0.113.9");
  });

  it("forwards nothing when the header is missing or malformed (fails to a shared address, never to a forged one)", async () => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
    resetApiConfigForTests();
    const upstream = stubUpstream(jsonResponse(401, errorBody("invalid_credentials")));
    await signInAction(STRONG);
    nextState.headers.set("x-forwarded-for", "garbage");
    await signInAction(STRONG);
    expect(upstream.calls.map((c) => c.headers["X-Forwarded-For"])).toEqual([undefined, undefined]);
  });
});

describe("signUpAction", () => {
  it("registers a brand and sends it to campaign creation", async () => {
    const upstream = stubUpstream(jsonResponse(201, { data: { user: apiUser() } }, { "set-cookie": sessionCookie() }));
    expect(await signUpAction(SIGN_UP)).toEqual({ ok: true, redirectTo: "/campaigns/new" });
    expect(JSON.parse(String(upstream.calls[0]!.init.body))).toEqual(SIGN_UP);
    expect(nextState.writes[0]).toMatchObject({ name: "ioh_session", value: TOKEN });
  });

  it("registers a creator as pending and sends them to the application", async () => {
    stubUpstream(jsonResponse(201, { data: { user: apiUser({ role: "creator", status: "pending", restricted: true }) } }, { "set-cookie": sessionCookie() }));
    expect(await signUpAction({ ...SIGN_UP, accountType: "creator" })).toEqual({ ok: true, redirectTo: "/for-creators/apply/profile" });
  });

  it("reports a taken e-mail", async () => {
    stubUpstream(jsonResponse(409, errorBody("email_already_registered")));
    expect(await signUpAction(SIGN_UP)).toEqual({ ok: false, error: { kind: "email_taken" } });
    expect(nextState.writes).toHaveLength(0);
  });

  it("maps the API's validation details to form fields", async () => {
    stubUpstream(jsonResponse(422, errorBody("validation_failed", "x", { details: [{ path: "body.phone", message: "must be a 9-digit number" }, { path: "body.password", message: "too weak" }] })));
    expect(await signUpAction(SIGN_UP)).toEqual({ ok: false, error: { kind: "validation", fieldErrors: { phone: "must be a 9-digit number", password: "too weak" } } });
  });

  it("validates locally without calling the API: terms, weak password, bad account type", async () => {
    const upstream = stubUpstream(jsonResponse(201, { data: { user: apiUser() } }));
    const noTerms = await signUpAction({ ...SIGN_UP, acceptTerms: false });
    expect(noTerms).toMatchObject({ ok: false, error: { kind: "validation", fieldErrors: { terms: expect.any(String) } } });
    const weak = await signUpAction({ ...SIGN_UP, password: "onlyletters" });
    expect(weak).toMatchObject({ ok: false, error: { kind: "validation", fieldErrors: { password: expect.any(String) } } });
    expect((await signUpAction({ ...SIGN_UP, accountType: "admin" })).ok).toBe(false);
    expect((await signUpAction(null)).ok).toBe(false);
    expect(upstream.calls).toHaveLength(0);
  });

  it("cannot be used to register an admin or smuggle extra fields", async () => {
    const upstream = stubUpstream(jsonResponse(201, { data: { user: apiUser() } }, { "set-cookie": sessionCookie() }));
    await signUpAction({ ...SIGN_UP, role: "admin", status: "active" });
    expect(Object.keys(JSON.parse(String(upstream.calls[0]!.init.body))).sort()).toEqual(["acceptTerms", "accountType", "email", "fullName", "password", "phone"]);
  });
});

describe("signOutAction", () => {
  it("revokes the session at the API, deletes the cookie and redirects to sign-in", async () => {
    nextState.cookies.set("ioh_session", TOKEN);
    const upstream = stubUpstream(jsonResponse(200, { data: { loggedOut: true } }, { "set-cookie": "ioh_session=; Max-Age=0; Path=/" }));
    expect(await redirectTarget(() => signOutAction())).toBe("/sign-in");
    expect(upstream.calls[0]!.url).toBe("http://api.test/api/v1/auth/logout");
    expect(upstream.calls[0]!.headers.Cookie).toBe(`ioh_session=${TOKEN}`);
    expect(nextState.deletes).toEqual(["ioh_session"]);
    expect(nextState.cookies.has("ioh_session")).toBe(false);
  });

  it("clears the cookie even if the API is unreachable", async () => {
    nextState.cookies.set("ioh_session", TOKEN);
    stubUpstream(new TypeError("fetch failed"));
    expect(await redirectTarget(() => signOutAction())).toBe("/sign-in");
    expect(nextState.deletes).toEqual(["ioh_session"]);
  });

  it("still redirects (and calls nothing) when there is no session", async () => {
    const upstream = stubUpstream(jsonResponse(200, { data: {} }));
    await expect(signOutAction()).rejects.toBeInstanceOf(RedirectSignal);
    expect(upstream.calls).toHaveLength(0);
  });

  it("ignores a malformed cookie value instead of forwarding it", async () => {
    nextState.cookies.set("ioh_session", "bad value;x=1");
    const upstream = stubUpstream(jsonResponse(200, { data: {} }));
    await redirectTarget(() => signOutAction());
    expect(upstream.calls).toHaveLength(0);
    expect(nextState.deletes).toEqual(["ioh_session"]);
  });
});

describe("logging", () => {
  it("does not log credentials or tokens on any failure path", async () => {
    const spies = [vi.spyOn(console, "error"), vi.spyOn(console, "warn"), vi.spyOn(console, "log"), vi.spyOn(console, "info")].map((spy) => spy.mockImplementation(() => undefined));
    for (const answer of [new TypeError("fetch failed"), jsonResponse(500, errorBody("internal_error")), jsonResponse(401, errorBody("invalid_credentials")), jsonResponse(200, { nodata: 1 })]) {
      stubUpstream(answer);
      await signInAction({ email: "a@b.cc", password: "Sup3rSecretPw1" });
      await signUpAction({ ...SIGN_UP, password: "Sup3rSecretPw1" });
    }
    for (const spy of spies) expect(JSON.stringify(spy.mock.calls)).not.toMatch(/Sup3rSecretPw1|AbCdEf0123456789/);
  });
});
