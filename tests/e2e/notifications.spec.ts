import { expect, request as pwRequest, test } from "@playwright/test";
import type { APIRequestContext, Browser, BrowserContext, Page } from "@playwright/test";
import { ACCOUNTS, API_MAIN, APP, PASSWORD, alertOf, apiToken, approvedCreator, collectBodies, newBrandSession, signIn, tokenOf, trackRequests, uniqueEmail } from "./helpers";

type ApiNotification = { id: string; type: string; title: string; body: string; readAt: string | null; links: { offerId: string | null } };

const cookie = (token: string) => ({ Cookie: `ioh_session=${token}`, "Content-Type": "application/json" });

async function notificationsOf(request: APIRequestContext, token: string, query = ""): Promise<ApiNotification[]> {
  const response = await request.get(`${API_MAIN}/notifications?limit=50${query}`, { headers: cookie(token) });
  expect(response.status()).toBe(200);
  return ((await response.json()) as { data: ApiNotification[] }).data;
}

async function unreadOf(request: APIRequestContext, token: string): Promise<number> {
  const response = await request.get(`${API_MAIN}/notifications/unread-count`, { headers: cookie(token) });
  return ((await response.json()) as { data: { unread: number } }).data.unread;
}

async function signedIn(browser: Browser, email: string, landing: RegExp): Promise<{ context: BrowserContext; page: Page; token: string }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, email);
  await page.waitForURL(landing);
  return { context, page, token: await tokenOf(context) };
}

const badge = (page: Page) => page.getByTestId("unread-badge");

test.describe("in-app notifications against the real API", () => {
  test("a hire request notifies the creator; reading it persists; the answer notifies the brand", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const creator = await approvedCreator(browser, request);
    const brand = await newBrandSession(browser);
    const brandRequests = trackRequests(brand.page);
    const brandBodies = collectBodies(brand.page);
    const brandBefore = await unreadOf(request, brand.token); // a brand-new brand: no notifications of its own yet

    await brand.page.goto(`${APP}/influencers/${creator.username}/hire`);
    await brand.page.getByLabel(/Your Full Name/).fill("Jane Brand");
    await brand.page.getByLabel(/Location/).fill("Douala");
    await brand.page.getByRole("button", { name: "Submit Hire Request" }).click();
    await expect(brand.page.getByRole("heading", { name: "Hire request sent" })).toBeVisible();

    // The creator signs in: the bell shows exactly what the API counts, and the page lists exactly what the API holds.
    const inbox = await signedIn(browser, creator.email, /\/creator\/requests$/);
    const apiList = await notificationsOf(request, inbox.token);
    const apiUnread = await unreadOf(request, inbox.token);
    expect(apiList.some((n) => n.type === "offer_received" && n.readAt === null)).toBe(true);
    expect(apiUnread).toBe(apiList.filter((n) => n.readAt === null).length);
    await expect(badge(inbox.page)).toHaveText(String(apiUnread));
    await inbox.page.getByRole("link", { name: /^Notifications/ }).click();
    await expect(inbox.page).toHaveURL(`${APP}/creator/notifications`);
    await expect(inbox.page.getByRole("heading", { level: 1 })).toHaveText("Notifications");
    await expect(inbox.page.getByText(/nothing is sent by e-mail or SMS/)).toBeVisible();
    const received = apiList.find((n) => n.type === "offer_received")!;
    const row = inbox.page.getByRole("listitem").filter({ hasText: received.title }).filter({ hasText: received.body });
    await expect(row.getByText("New", { exact: true })).toBeVisible();
    await expect(row.getByRole("link", { name: "View requests" })).toHaveAttribute("href", "/creator/requests");

    // Mark one read: the API stores it, the badge goes down, a reload keeps it.
    await row.getByRole("button", { name: "Mark as read" }).click();
    await expect(row.getByRole("button", { name: "Mark as read" })).toHaveCount(0);
    await expect(row.getByText("New", { exact: true })).toHaveCount(0);
    expect((await notificationsOf(request, inbox.token)).find((n) => n.id === received.id)!.readAt).not.toBeNull();
    expect(await unreadOf(request, inbox.token)).toBe(apiUnread - 1);
    await inbox.page.reload();
    await expect(inbox.page.getByRole("listitem").filter({ hasText: received.body }).getByText("New", { exact: true })).toHaveCount(0);
    if (apiUnread - 1 > 0) await expect(badge(inbox.page)).toHaveText(String(apiUnread - 1));
    else await expect(badge(inbox.page)).toHaveCount(0);

    // The unread filter only lists unread rows.
    await inbox.page.getByRole("link", { name: /^Unread/ }).click();
    await expect(inbox.page).toHaveURL(`${APP}/creator/notifications?unread=true`);
    await expect(inbox.page.getByRole("listitem").filter({ hasText: received.body })).toHaveCount(0);

    // Mark all: nothing unread is left, and the badge disappears.
    await inbox.page.goto(`${APP}/creator/notifications`);
    if (apiUnread - 1 > 0) {
      await inbox.page.getByRole("button", { name: "Mark all as read" }).click();
    }
    await expect.poll(() => unreadOf(request, inbox.token)).toBe(0);
    await expect(inbox.page.getByRole("button", { name: /Mark all as read|Marking/ })).toHaveCount(0);
    await expect(badge(inbox.page)).toHaveCount(0);

    // The creator accepts; the brand is notified and its bell grows by one.
    await inbox.page.goto(`${APP}/creator/requests`);
    await inbox.page.getByRole("button", { name: "Accept Request" }).click();
    await expect(inbox.page.getByRole("status")).toContainText("Accepted");
    await expect.poll(() => unreadOf(request, brand.token)).toBe(brandBefore + 1);
    await brand.page.goto(`${APP}/brand/notifications`);
    const accepted = (await notificationsOf(request, brand.token)).find((n) => n.type === "offer_accepted" && n.readAt === null)!;
    const brandRow = brand.page.getByRole("listitem").filter({ hasText: accepted.body });
    await expect(brandRow).toContainText("Hire request");
    await expect(brandRow.getByRole("link", { name: "View hire requests" })).toHaveAttribute("href", "/brand/offers");
    await expect(badge(brand.page)).toHaveText(String(brandBefore + 1));

    // The browser only talked to the app, and nothing carried the session.
    expect(brandRequests.filter((url) => url.includes(":4100") || url.includes("/api/v1/"))).toEqual([]);
    for (const response of brandBodies) expect(response.text, response.url).not.toContain(brand.token);
    await brand.context.close();
    await inbox.context.close();
  });

  test("another account never sees or changes someone else's notifications", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const creator = await approvedCreator(browser, request);
    // A cookie-less client, so the checks below can only use the session tokens passed explicitly.
    const direct = await pwRequest.newContext();
    const creatorToken = await apiToken(direct, creator.email);
    const mine = await notificationsOf(direct, creatorToken);
    expect(mine.length).toBeGreaterThan(0);

    const email = uniqueEmail("brand");
    const other = await browser.newContext();
    const page = await other.newPage();
    await page.goto(`${APP}/sign-up`);
    await page.getByLabel(/business name|full name/i).fill("Other Brand");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel(/mobile number/i).fill(`67${Math.floor(1000000 + Math.random() * 8999999)}`);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /create account/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("sign-up"));
    await page.goto(`${APP}/brand/notifications`);
    await expect(page.locator("body")).not.toContainText(mine[0]!.body);

    // Straight at the API with the other account's session: not found, and the row stays unread.
    const token = await apiToken(direct, email);
    const foreign = mine.find((n) => n.readAt === null)!;
    expect((await direct.post(`${API_MAIN}/notifications/${foreign.id}/read`, { headers: cookie(token), data: {} })).status()).toBe(404);
    expect((await notificationsOf(direct, creatorToken)).find((n) => n.id === foreign.id)!.readAt).toBeNull();
    await direct.dispose();
    await other.close();
  });

  test("anonymous visitors and the wrong role are kept out; an ended session on the page offers sign-in", async ({ page, browser, request }) => {
    test.setTimeout(120_000);
    await page.goto(`${APP}/brand/notifications`);
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fbrand%2Fnotifications/);
    await page.goto(`${APP}/creator/notifications`);
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcreator%2Fnotifications/);

    const creator = await signedIn(browser, ACCOUNTS.activeCreator, /\/creator\/requests$/);
    await creator.page.goto(`${APP}/brand/notifications`);
    await expect(creator.page).not.toHaveURL(`${APP}/brand/notifications`);
    await creator.context.close();

    const brand = await signedIn(browser, ACCOUNTS.brand, /\/brand\/payments$/);
    await brand.page.goto(`${APP}/creator/notifications`);
    await expect(brand.page).not.toHaveURL(`${APP}/creator/notifications`);
    await brand.context.close();

    // A new creator always has one unread notification (the approval): end the session, then try to mark it read.
    const fresh = await approvedCreator(browser, request);
    const own = await signedIn(browser, fresh.email, /\/creator\/requests$/);
    await own.page.goto(`${APP}/creator/notifications`);
    await expect(own.page.getByRole("heading", { level: 1 })).toHaveText("Notifications");
    await own.context.clearCookies();
    await own.page.getByRole("button", { name: "Mark all as read" }).click();
    await expect(alertOf(own.page)).toContainText(/session has ended/i);
    await expect(own.page.getByRole("link", { name: "Sign in again" })).toBeVisible();
    await expect(own.page.getByRole("listitem").filter({ hasText: "Your account has been approved" }).getByText("New", { exact: true })).toBeVisible();
    await own.context.close();
  });
});
