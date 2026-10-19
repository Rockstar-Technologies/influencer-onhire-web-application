import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiConfigForTests } from "@/lib/api/config";
import { NOTIFICATION_ID, TEST_CONFIG, TOKEN, apiUser, errorBody, jsonResponse, notificationView, routeFetch } from "../helpers";
import { nextState, resetNextState } from "../mocks/next";

vi.mock("next/headers", async () => (await import("../mocks/next")).headersModule);
vi.mock("next/navigation", async () => (await import("../mocks/next")).navigationModule);
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

const actions = await import("@/features/notifications/actions");
const server = await import("@/features/notifications/server");

const me = (user: Record<string, unknown> = {}) => jsonResponse(200, { data: { user: apiUser(user), session: { expiresAt: "2026-12-31T00:00:00.000Z" } } });
const READ = `POST /notifications/${NOTIFICATION_ID}/read`;
const calls = (fake: ReturnType<typeof routeFetch>) => fake.keys().filter((k) => k !== "GET /auth/me");

function upstream(routes: Parameters<typeof routeFetch>[0], user: Record<string, unknown> = {}) {
  const fake = routeFetch({ "GET /auth/me": me(user), ...routes });
  vi.stubGlobal("fetch", fake.fetch);
  return fake;
}

beforeEach(() => {
  resetNextState();
  resetApiConfigForTests();
  vi.stubEnv("API_BASE_URL", TEST_CONFIG.baseUrl);
  vi.stubEnv("TRUSTED_PROXY_HOPS", "0");
  nextState.cookies.set("ioh_session", TOKEN);
});

describe("marking one notification read", () => {
  it.each([["a brand", { role: "brand" }], ["an active creator", { role: "creator" }]])("%s: POSTs to that notification's path with an empty body and returns the API's row", async (_n, user) => {
    const fake = upstream({ [READ]: jsonResponse(200, { data: { notification: notificationView({ readAt: "2026-10-19T12:00:00.000Z" }) } }) }, user);
    const result = await actions.markNotificationReadAction({ id: NOTIFICATION_ID });
    expect(result).toMatchObject({ ok: true, notification: { id: NOTIFICATION_ID, readAt: "2026-10-19T12:00:00.000Z" } });
    expect(calls(fake)).toEqual([READ]);
    expect(JSON.parse(String(fake.calls[fake.keys().indexOf(READ)]!.init.body))).toEqual({});
  });

  it("repeating it is harmless: the second answer is the same success", async () => {
    upstream({ [READ]: jsonResponse(200, { data: { notification: notificationView({ readAt: "2026-10-19T12:00:00.000Z" }) } }) });
    expect((await actions.markNotificationReadAction({ id: NOTIFICATION_ID })).ok).toBe(true);
    expect((await actions.markNotificationReadAction({ id: NOTIFICATION_ID })).ok).toBe(true);
  });

  it("refuses anything but an id before calling the API (no user id, read time or content; no odd path)", async () => {
    const fake = upstream({});
    for (const input of [{}, null, "x", { id: "../admin" }, { id: NOTIFICATION_ID, userId: "other" }, { id: NOTIFICATION_ID, readAt: "2020-01-01T00:00:00Z" }, { id: `${NOTIFICATION_ID}?x=1` }]) {
      expect(await actions.markNotificationReadAction(input), JSON.stringify(input)).toMatchObject({ ok: false });
    }
    expect(calls(fake)).toEqual([]);
  });

  it("someone else's notification answers 'not found' and is never claimed read", async () => {
    upstream({ [READ]: jsonResponse(404, errorBody("not_found", "Notification not found")) });
    expect(await actions.markNotificationReadAction({ id: NOTIFICATION_ID })).toEqual({ ok: false, error: { kind: "not_found" } });
  });

  it.each([
    ["an administrator", { role: "admin", phone: null }],
    ["a pending creator", { role: "creator", status: "pending" }],
    ["a suspended brand", { role: "brand", status: "suspended" }],
  ])("%s is refused here without calling the API", async (_n, user) => {
    const fake = upstream({}, user);
    expect(await actions.markNotificationReadAction({ id: NOTIFICATION_ID })).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    expect(await actions.markAllNotificationsReadAction({})).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    expect(calls(fake)).toEqual([]);
  });

  it("without a cookie nothing is sent; an ended session keeps the cookie so the page stays", async () => {
    nextState.cookies.clear();
    const fake = upstream({});
    expect(await actions.markNotificationReadAction({ id: NOTIFICATION_ID })).toEqual({ ok: false, error: { kind: "unauthenticated" } });
    expect(fake.calls).toHaveLength(0);
    nextState.cookies.set("ioh_session", TOKEN);
    vi.stubGlobal("fetch", routeFetch({ "GET /auth/me": jsonResponse(401, errorBody("unauthorized")) }).fetch);
    expect(await actions.markAllNotificationsReadAction({})).toEqual({ ok: false, error: { kind: "unauthenticated" } });
    expect(nextState.deletes).toEqual([]);
  });

  it("a session that ends during the call is reported", async () => {
    upstream({ [READ]: jsonResponse(401, errorBody("unauthorized")) });
    expect(await actions.markNotificationReadAction({ id: NOTIFICATION_ID })).toEqual({ ok: false, error: { kind: "unauthenticated" } });
  });

  it.each([
    { label: "network failure", answer: new TypeError("fetch failed") },
    { label: "server error", answer: jsonResponse(500, errorBody("internal_error")) },
    { label: "malformed answer", answer: jsonResponse(200, { data: { notification: { id: "nope" } } }) },
  ])("a $label is 'unavailable' and nothing is claimed read", async ({ answer }) => {
    upstream({ [READ]: answer });
    expect(await actions.markNotificationReadAction({ id: NOTIFICATION_ID })).toMatchObject({ ok: false, error: { kind: "unavailable" } });
  });

  it("a failed attempt can be retried", async () => {
    let attempt = 0;
    upstream({ [READ]: () => (++attempt === 1 ? jsonResponse(503, errorBody("request_timeout")) : jsonResponse(200, { data: { notification: notificationView({ readAt: "2026-10-19T12:00:00.000Z" }) } })) });
    expect(await actions.markNotificationReadAction({ id: NOTIFICATION_ID })).toMatchObject({ ok: false });
    expect(await actions.markNotificationReadAction({ id: NOTIFICATION_ID })).toMatchObject({ ok: true });
  });

  it("never logs or returns the session value", async () => {
    const spies = [vi.spyOn(console, "error"), vi.spyOn(console, "warn"), vi.spyOn(console, "log")].map((s) => s.mockImplementation(() => undefined));
    upstream({ [READ]: new TypeError("boom") });
    const result = await actions.markNotificationReadAction({ id: NOTIFICATION_ID });
    expect(JSON.stringify(result)).not.toContain("AbCdEf0123456789");
    for (const spy of spies) expect(JSON.stringify(spy.mock.calls)).not.toContain("AbCdEf0123456789");
  });
});

describe("marking all read", () => {
  it("POSTs once with an empty body and reports the API's count", async () => {
    const fake = upstream({ "POST /notifications/read-all": jsonResponse(200, { data: { updated: 3, unread: 0 } }) });
    expect(await actions.markAllNotificationsReadAction({})).toEqual({ ok: true, updated: 3 });
    expect(calls(fake)).toEqual(["POST /notifications/read-all"]);
  });

  it("refuses extra fields (a user id) before calling the API", async () => {
    const fake = upstream({});
    expect(await actions.markAllNotificationsReadAction({ userId: "x" })).toMatchObject({ ok: false });
    expect(calls(fake)).toEqual([]);
  });

  it("a rate limit carries the wait time", async () => {
    upstream({ "POST /notifications/read-all": jsonResponse(429, errorBody("rate_limited"), { "retry-after": "60" }) });
    expect(await actions.markAllNotificationsReadAction({})).toMatchObject({ ok: false, error: { kind: "rate_limited", retryAfterSeconds: 60 } });
  });
});

describe("loading (server side)", () => {
  const list = (items: unknown[], nextCursor: string | null = null) => jsonResponse(200, { data: items, meta: { nextCursor, limit: 20 } });

  it("loads one page and the unread count together, passing the filter and a valid cursor", async () => {
    const fake = upstream({ "GET /notifications": list([notificationView()], "abc"), "GET /notifications/unread-count": jsonResponse(200, { data: { unread: 4 } }) });
    const page = await server.loadNotifications("brand", { unread: true, cursor: "abc_-=" });
    expect(page).toMatchObject({ items: [{ id: NOTIFICATION_ID }], nextCursor: "abc", unreadOnly: true, unread: 4 });
    const url = new URL(fake.calls[fake.keys().indexOf("GET /notifications")]!.url);
    expect(Object.fromEntries(url.searchParams)).toEqual({ limit: "20", unread: "true", cursor: "abc_-=" });
  });

  it("drops a malformed cursor instead of sending it", async () => {
    const fake = upstream({ "GET /notifications": list([]), "GET /notifications/unread-count": jsonResponse(200, { data: { unread: 0 } }) });
    await server.loadNotifications("creator", { cursor: "../x?y=1" });
    expect(new URL(fake.calls[fake.keys().indexOf("GET /notifications")]!.url).searchParams.has("cursor")).toBe(false);
  });

  it("an ended session redirects to sign-in and back", async () => {
    upstream({ "GET /notifications": jsonResponse(401, errorBody("unauthorized")), "GET /notifications/unread-count": jsonResponse(401, errorBody("unauthorized")) });
    await expect(server.loadNotifications("brand", {})).rejects.toMatchObject({ url: expect.stringContaining("/sign-in?next=%2Fbrand%2Fnotifications") });
  });

  it("an API failure is thrown to the error page (not shown as an empty inbox)", async () => {
    upstream({ "GET /notifications": jsonResponse(500, errorBody("internal_error")), "GET /notifications/unread-count": jsonResponse(500, errorBody("internal_error")) });
    await expect(server.loadNotifications("brand", {})).rejects.toBeTruthy();
  });

  it("the header count never throws: any failure hides the badge", async () => {
    upstream({ "GET /notifications/unread-count": jsonResponse(500, errorBody("internal_error")) });
    expect(await server.loadUnreadCount()).toBeNull();
    upstream({ "GET /notifications/unread-count": jsonResponse(401, errorBody("unauthorized")) });
    expect(await server.loadUnreadCount()).toBeNull();
    upstream({ "GET /notifications/unread-count": jsonResponse(200, { data: { unread: 7 } }) });
    expect(await server.loadUnreadCount()).toBe(7);
    nextState.cookies.clear();
    expect(await server.loadUnreadCount()).toBeNull();
  });
});
