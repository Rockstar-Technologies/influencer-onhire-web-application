import { expect, test } from "@playwright/test";
import type { APIRequestContext, Browser, BrowserContext, Page } from "@playwright/test";
import { ACCOUNTS, API_MAIN, APP, PASSWORD, alertOf, apiToken, approvedCreator, collectBodies, managerToken, signIn, tokenOf, trackRequests, uniqueEmail } from "./helpers";

type ApiOffer = { id: string; reference: string; status: string; origin: string; initiator: string; priceXaf: number; window: { startDate: string; endDate: string } | null; hire: { contactName: string; durationDays: number; paymentMethod: { code: string } } | null; campaign: { id: string; title: string } | null; creator?: { username: string } };

const cookie = (token: string) => ({ Cookie: `ioh_session=${token}`, "Content-Type": "application/json" });

async function offersOf(request: APIRequestContext, token: string, side: "brand" | "creator"): Promise<ApiOffer[]> {
  const response = await request.get(`${API_MAIN}/${side}/offers?limit=50`, { headers: cookie(token) });
  expect(response.status()).toBe(200);
  return ((await response.json()) as { data: ApiOffer[] }).data;
}

/** A date `days` from today (the browser's local calendar day, the same day the app uses for its start-date hint). */
function inDays(days: number) {
  const d = new Date(Date.now() + days * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function signedIn(browser: Browser, email: string, landing: RegExp): Promise<{ context: BrowserContext; page: Page; token: string }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, email);
  await page.waitForURL(landing);
  return { context, page, token: await tokenOf(context) };
}

async function sendHire(page: Page, username: string) {
  await page.goto(`${APP}/influencers/${username}/hire`);
  await page.getByLabel(/Your Full Name/).fill("Jane Brand");
  await page.getByLabel(/Location/).fill("Douala, Cameroon");
  await page.getByRole("button", { name: "Submit Hire Request" }).click();
}

test.describe("direct hires and the creator inbox against the real API", () => {
  test("a brand hires a creator at the listed rate, the creator accepts with a start date, and both sides see the real state", async ({ browser, request }) => {
    test.setTimeout(120_000);
    const creator = await approvedCreator(browser, request);
    const brand = await signedIn(browser, ACCOUNTS.brand, /\/brand\/payments$/);
    const requests = trackRequests(brand.page);
    const bodies = collectBodies(brand.page);

    await brand.page.goto(`${APP}/influencers/${creator.username}/hire`);
    await expect(brand.page.getByRole("heading", { level: 1 })).toContainText("Amina Beauty");
    await expect(brand.page.getByLabel(/Platform/).locator("option")).toHaveText(["Instagram · 85,000 FCFA"]);
    await expect(brand.page.getByText(/current rate on Instagram/)).toContainText("85,000 FCFA");
    await expect(brand.page.getByLabel(/price|amount/i)).toHaveCount(0);
    await brand.page.getByLabel(/Your Full Name/).fill("Jane Brand");
    await brand.page.getByLabel(/Location/).fill("Douala, Cameroon");
    await brand.page.getByLabel(/Your Social Media Handle/).fill("acmefoods");
    await brand.page.getByRole("button", { name: "Submit Hire Request" }).click();
    await expect(brand.page.getByRole("heading", { name: "Hire request sent" })).toBeVisible();
    await expect(brand.page.getByRole("term").filter({ hasText: "Price" }).locator("xpath=following-sibling::dd[1]")).toHaveText("85,000 FCFA");

    // What the API stored: the creator's listed rate, frozen; the typed contact; the platform and method the creator offers.
    const stored = (await offersOf(request, brand.token, "brand")).find((o) => o.creator?.username === creator.username)!;
    expect(stored).toMatchObject({ status: "pending", origin: "direct_hire", initiator: "brand", priceXaf: 85000, hire: { contactName: "Jane Brand", paymentMethod: { code: "mtn_momo" } } });

    // A second request to the same creator is refused by the API and explained.
    await brand.page.goto(`${APP}/influencers/${creator.username}/hire`);
    await brand.page.getByLabel(/Your Full Name/).fill("Jane Brand");
    await brand.page.getByLabel(/Location/).fill("Douala");
    await brand.page.getByRole("button", { name: "Submit Hire Request" }).click();
    await expect(alertOf(brand.page)).toContainText("already have a pending request");
    expect((await offersOf(request, brand.token, "brand")).filter((o) => o.creator?.username === creator.username)).toHaveLength(1);

    await brand.page.goto(`${APP}/brand/offers`);
    const card = brand.page.getByRole("listitem").filter({ hasText: stored.reference });
    await expect(card).toContainText("Pending");
    await expect(card.getByRole("button", { name: "Cancel request" })).toBeVisible();

    // The creator answers.
    const inbox = await signedIn(browser, creator.email, /\/creator\/requests$/);
    const article = inbox.page.getByRole("article", { name: `Direct hire ${stored.reference}` });
    await expect(article).toContainText("Acme Foods wants to hire you");
    await expect(article).toContainText("85,000 FCFA");
    await expect(article).toContainText("Jane Brand");
    const start = inDays(20);
    await article.getByLabel(/Start date/).fill(start);
    await article.getByRole("button", { name: "Accept Request" }).click();
    await expect(inbox.page.getByRole("status")).toContainText(`Accepted ${stored.reference}`);
    await expect(inbox.page.getByRole("article", { name: `Direct hire ${stored.reference}` })).toHaveCount(0);
    const row = inbox.page.getByRole("row").filter({ hasText: stored.reference });
    await expect(row).toContainText("Accepted");
    await expect(row).toContainText("Funding due by");

    const accepted = (await offersOf(request, inbox.token, "creator")).find((o) => o.id === stored.id)!;
    expect(accepted.status).toBe("accepted");
    expect(accepted.window!.startDate).toBe(start);
    expect(accepted.hire!.durationDays).toBe(30);

    await brand.page.reload();
    await expect(brand.page.getByRole("listitem").filter({ hasText: stored.reference })).toContainText("Accepted");
    await expect(brand.page.getByRole("listitem").filter({ hasText: stored.reference })).toContainText("Fund by");
    await expect(brand.page.getByRole("listitem").filter({ hasText: stored.reference }).getByRole("button")).toHaveCount(0);

    // Only the app was contacted by the browser, and no response carried the session.
    expect(requests.filter((url) => url.includes(":4100") || url.includes("/api/v1/"))).toEqual([]);
    for (const response of bodies) expect(response.text, response.url).not.toContain(brand.token);
    await brand.context.close();
    await inbox.context.close();
  });

  test("a brand can cancel a pending hire; the creator sees it closed and cannot accept it", async ({ browser, request }) => {
    test.setTimeout(120_000);
    const creator = await approvedCreator(browser, request);
    const brand = await signedIn(browser, ACCOUNTS.brand, /\/brand\/payments$/);
    await sendHire(brand.page, creator.username);
    await expect(brand.page.getByRole("heading", { name: "Hire request sent" })).toBeVisible();
    const hire = (await offersOf(request, brand.token, "brand")).find((o) => o.creator?.username === creator.username)!;

    // The creator opens the inbox before the cancellation and keeps it open.
    const inbox = await signedIn(browser, creator.email, /\/creator\/requests$/);
    await expect(inbox.page.getByRole("article", { name: `Direct hire ${hire.reference}` })).toBeVisible();

    await brand.page.goto(`${APP}/brand/offers`);
    brand.page.once("dialog", (dialog) => void dialog.accept());
    await brand.page.getByRole("listitem").filter({ hasText: hire.reference }).getByRole("button", { name: "Cancel request" }).click();
    await expect(brand.page.getByRole("listitem").filter({ hasText: hire.reference })).toContainText("Cancelled");
    expect((await offersOf(request, brand.token, "brand")).find((o) => o.id === hire.id)!.status).toBe("cancelled");

    // The stale card in the creator's open page can no longer be accepted: the API says so, nothing is claimed, and the page refreshes to the truth.
    await inbox.page.getByRole("article", { name: `Direct hire ${hire.reference}` }).getByRole("button", { name: "Accept Request" }).click();
    await expect(alertOf(inbox.page)).toContainText("already been answered or has closed");
    await expect(inbox.page.getByRole("article", { name: `Direct hire ${hire.reference}` })).toHaveCount(0);
    await expect(inbox.page.getByRole("row").filter({ hasText: hire.reference })).toContainText("Cancelled");
    expect((await offersOf(request, inbox.token, "creator")).find((o) => o.id === hire.id)!.status).toBe("cancelled");
    await brand.context.close();
    await inbox.context.close();
  });

  test("a creator declines with one of the API's reasons and the brand sees 'Declined'; the brand may then ask again", async ({ browser, request }) => {
    test.setTimeout(120_000);
    const creator = await approvedCreator(browser, request);
    const brand = await signedIn(browser, ACCOUNTS.brand, /\/brand\/payments$/);
    await sendHire(brand.page, creator.username);
    await expect(brand.page.getByRole("heading", { name: "Hire request sent" })).toBeVisible();
    const hire = (await offersOf(request, brand.token, "brand")).find((o) => o.creator?.username === creator.username)!;

    const inbox = await signedIn(browser, creator.email, /\/creator\/requests$/);
    const article = inbox.page.getByRole("article", { name: `Direct hire ${hire.reference}` });
    await article.getByRole("button", { name: "Decline" }).click();
    await expect(article.getByRole("button", { name: "Confirm Decline" })).toBeDisabled();
    await expect(article.getByLabel(/Why are you declining/).locator("option")).toHaveText(["Choose a reason", "Schedule conflict", "Budget doesn't match my rates", "Not a fit for my audience", "Other"]);
    await article.getByLabel(/Why are you declining/).selectOption({ label: "Schedule conflict" });
    await article.getByRole("button", { name: "Confirm Decline" }).click();
    await expect(inbox.page.getByRole("status")).toContainText(`Declined ${hire.reference}`);
    await expect(inbox.page.getByRole("row").filter({ hasText: hire.reference })).toContainText("Declined");
    expect((await offersOf(request, inbox.token, "creator")).find((o) => o.id === hire.id)!.status).toBe("declined");

    await brand.page.goto(`${APP}/brand/offers?status=declined`);
    await expect(brand.page.getByRole("listitem").filter({ hasText: hire.reference })).toContainText("Declined");
    await sendHire(brand.page, creator.username);
    await expect(brand.page.getByRole("heading", { name: "Hire request sent" })).toBeVisible();
    await brand.context.close();
    await inbox.context.close();
  });

  test("a platform invitation to an opened campaign appears in the inbox; accepting books the campaign's own dates", async ({ browser, request }) => {
    test.setTimeout(180_000);
    const creator = await approvedCreator(browser, request);
    const brand = await signedIn(browser, ACCOUNTS.brand, /\/brand\/payments$/);
    const year = 2060 + Math.floor(Math.random() * 30);
    const title = `Invite ${Date.now().toString(36)}`;
    const created = await request.post(`${API_MAIN}/brand/campaigns`, {
      headers: cookie(brand.token),
      data: { title, niche: "beauty", budgetXaf: 200000, startDate: `${year}-03-01`, endDate: `${year}-03-15`, deliverables: "Two stories and one reel", minEngagementPct: null, cities: ["douala"], interests: [], ageRanges: [], imageFileIds: [] },
    });
    expect(created.status()).toBe(201);
    const campaignId = ((await created.json()) as { data: { campaign: { id: string } } }).data.campaign.id;
    expect((await request.post(`${API_MAIN}/brand/campaigns/${campaignId}/submit`, { headers: cookie(brand.token), data: {} })).status()).toBe(200);
    expect((await request.post(`${API_MAIN}/admin/campaigns/${campaignId}/approve`, { headers: cookie(await managerToken(request)), data: {} })).status()).toBe(200);

    const inbox = await signedIn(browser, creator.email, /\/creator\/requests$/);
    await expect.poll(async () => (await offersOf(request, inbox.token, "creator")).some((o) => o.campaign?.id === campaignId), { timeout: 60_000, intervals: [1000] }).toBe(true);
    await inbox.page.reload();
    const invitation = (await offersOf(request, inbox.token, "creator")).find((o) => o.campaign?.id === campaignId)!;
    expect(invitation).toMatchObject({ origin: "campaign_match", initiator: "platform", status: "pending", priceXaf: 85000 });

    const article = inbox.page.getByRole("article", { name: `Platform invitation ${invitation.reference}` });
    await expect(article).toContainText(title);
    await expect(article).toContainText("85,000 FCFA");
    await expect(article.getByLabel(/Start date/)).toHaveCount(0);

    // The brand sees the invitation but cannot decide it.
    await brand.page.goto(`${APP}/brand/offers`);
    const brandCard = brand.page.getByRole("listitem").filter({ hasText: invitation.reference });
    await expect(brandCard).toContainText("Platform invitation");
    await expect(brandCard.getByRole("button")).toHaveCount(0);

    await article.getByRole("button", { name: "Accept Campaign" }).click();
    await expect(inbox.page.getByRole("status")).toContainText(`Accepted ${invitation.reference}`);
    const accepted = (await offersOf(request, inbox.token, "creator")).find((o) => o.id === invitation.id)!;
    expect(accepted).toMatchObject({ status: "accepted", window: { startDate: `${year}-03-01`, endDate: `${year}-03-15` } });

    // The first acceptance moved the campaign to "accepted"; the campaign page shows the API's status.
    await brand.page.goto(`${APP}/brand/campaigns/${campaignId}`);
    await expect(brand.page.getByText("Accepted").first()).toBeVisible();
    await brand.context.close();
    await inbox.context.close();
  });
});

test.describe("who may see and do what", () => {
  test("anonymous visitors, creators and brands are kept to their own pages", async ({ page, browser }) => {
    await page.goto(`${APP}/brand/offers`);
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fbrand%2Foffers/);
    await page.goto(`${APP}/creator/requests`);
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcreator%2Frequests/);
    await page.goto(`${APP}/influencers/kevin.fitness/hire`);
    await expect(page).toHaveURL(/\/sign-in\?next=%2Finfluencers%2Fkevin.fitness%2Fhire/);

    const creator = await signedIn(browser, ACCOUNTS.activeCreator, /\/creator\/requests$/);
    await creator.page.goto(`${APP}/brand/offers`);
    await expect(creator.page).not.toHaveURL(`${APP}/brand/offers`);
    await creator.page.goto(`${APP}/influencers/probe.creator/hire`);
    await expect(creator.page).not.toHaveURL(`${APP}/influencers/probe.creator/hire`);
    await creator.context.close();

    const brand = await signedIn(browser, ACCOUNTS.brand, /\/brand\/payments$/);
    await brand.page.goto(`${APP}/creator/requests`);
    await expect(brand.page).not.toHaveURL(`${APP}/creator/requests`);
    const missing = await brand.page.goto(`${APP}/influencers/nobody.here.at.all/hire`);
    expect(missing!.status()).toBe(404);
    const odd = await brand.page.goto(`${APP}/influencers/${encodeURIComponent("../admin")}/hire`);
    expect(odd!.status()).toBe(404);
    await brand.context.close();
  });

  test("another brand never sees or changes someone else's hires", async ({ browser, request }) => {
    test.setTimeout(120_000);
    const creator = await approvedCreator(browser, request);
    const first = await signedIn(browser, ACCOUNTS.brand, /\/brand\/payments$/);
    await sendHire(first.page, creator.username);
    await expect(first.page.getByRole("heading", { name: "Hire request sent" })).toBeVisible();
    const hire = (await offersOf(request, first.token, "brand")).find((o) => o.creator?.username === creator.username)!;

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
    await page.goto(`${APP}/brand/offers`);
    await expect(page.getByText("You haven't hired anyone yet.")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(hire.reference);

    // Directly at the API with the other brand's session: not found, exactly as for a missing offer.
    const token = await apiToken(request, email);
    for (const action of ["cancel", "accept", "decline"]) {
      expect((await request.post(`${API_MAIN}/brand/offers/${hire.id}/${action}`, { headers: cookie(token), data: {} })).status(), action).toBe(404);
    }
    expect((await offersOf(request, first.token, "brand")).find((o) => o.id === hire.id)!.status).toBe("pending");
    await other.close();
    await first.context.close();
  });

  test("an ended session on the inbox keeps the page, says nothing was changed and offers sign-in", async ({ browser, request }) => {
    test.setTimeout(120_000);
    const creator = await approvedCreator(browser, request);
    const brand = await signedIn(browser, ACCOUNTS.brand, /\/brand\/payments$/);
    await sendHire(brand.page, creator.username);
    await expect(brand.page.getByRole("heading", { name: "Hire request sent" })).toBeVisible();
    const hire = (await offersOf(request, brand.token, "brand")).find((o) => o.creator?.username === creator.username)!;

    const inbox = await signedIn(browser, creator.email, /\/creator\/requests$/);
    await inbox.context.clearCookies();
    await inbox.page.getByRole("article", { name: `Direct hire ${hire.reference}` }).getByRole("button", { name: "Accept Request" }).click();
    await expect(alertOf(inbox.page)).toContainText(/session has ended/i);
    await expect(inbox.page.getByRole("link", { name: "Sign in again" })).toBeVisible();
    await expect(inbox.page.getByRole("article", { name: `Direct hire ${hire.reference}` })).toBeVisible();
    expect((await offersOf(request, brand.token, "brand")).find((o) => o.id === hire.id)!.status).toBe("pending");
    await brand.context.close();
    await inbox.context.close();
  });
});
