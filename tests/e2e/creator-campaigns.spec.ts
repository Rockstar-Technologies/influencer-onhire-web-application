import { expect, test } from "@playwright/test";
import type { APIRequestContext, Browser } from "@playwright/test";
import { ACCOUNTS, API_MAIN, APP, alertOf, apiToken, approvedCreator, managerToken, newBrandSession, signIn } from "./helpers";

const cookie = (token: string) => ({ Cookie: `ioh_session=${token}`, "Content-Type": "application/json" });

/**
 * A brand-new brand with a campaign the campaign manager has approved (opened) through the real API. The campaign is aimed at Bamenda: the matching job
 * invites only creators of the targeted cities, so the Douala creators of these tests are NOT invited and must apply themselves. (City is a filter for
 * browsing and applying, not an eligibility rule.)
 */
async function openCampaign(request: APIRequestContext, browser: Browser, overrides: Record<string, unknown> = {}, approve = true) {
  const brand = await newBrandSession(browser);
  const tag = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const created = await request.post(`${API_MAIN}/brand/campaigns`, {
    headers: cookie(brand.token),
    data: { title: `Apply ${tag}`, niche: "beauty", budgetXaf: 200000, startDate: "2072-03-01", endDate: "2072-03-15", deliverables: "Two stories and one reel", minEngagementPct: null, cities: ["bamenda"], interests: [], ageRanges: [], imageFileIds: [], ...overrides },
  });
  expect(created.status()).toBe(201);
  const id = ((await created.json()) as { data: { campaign: { id: string } } }).data.campaign.id;
  expect((await request.post(`${API_MAIN}/brand/campaigns/${id}/submit`, { headers: cookie(brand.token), data: {} })).status()).toBe(200);
  if (approve) expect((await request.post(`${API_MAIN}/admin/campaigns/${id}/approve`, { headers: cookie(await managerToken(request)), data: {} })).status()).toBe(200);
  return { brand, id, title: `Apply ${tag}`, tag };
}

async function creatorSession(browser: Browser, email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, email);
  await page.waitForURL(/\/creator\/requests$/);
  return { context, page };
}

test.describe("creator campaign browse and apply against the real API", () => {
  test("a creator finds an open campaign, applies, the brand accepts, and both sides see the real state", async ({ browser, request }) => {
    test.setTimeout(180_000);
    const campaign = await openCampaign(request, browser);
    const creator = await approvedCreator(browser, request);
    const me = await creatorSession(browser, creator.email);

    await me.page.goto(`${APP}/creator/campaigns?q=${campaign.tag}`);
    await expect(me.page.getByRole("link", { name: campaign.title })).toBeVisible();
    await expect(me.page.getByRole("listitem").filter({ hasText: campaign.title })).toContainText("200,000 FCFA");
    await me.page.getByRole("link", { name: campaign.title }).click();
    await expect(me.page).toHaveURL(`${APP}/creator/campaigns/${campaign.id}`);
    await expect(me.page.getByText("Two stories and one reel")).toBeVisible();
    await expect(me.page.getByLabel("Your price (CFA)")).toHaveValue("85000"); // her Instagram rate

    // A price above the brand's maximum, and a too-short pitch, are stopped before anything is sent.
    await me.page.getByLabel("Your price (CFA)").fill("250000");
    await me.page.getByLabel("Your pitch").fill("short");
    await me.page.getByRole("button", { name: "Send application" }).click();
    await expect(me.page.getByText(/brand's maximum is 200,000 CFA/)).toBeVisible();
    await expect(me.page.getByText("Write at least 10 characters.")).toBeVisible();

    await me.page.getByLabel("Your price (CFA)").fill("90000");
    await me.page.getByLabel("Your pitch").fill("I make honest beauty reels for Douala audiences.");
    await me.page.getByRole("button", { name: "Send application" }).click();
    await expect(me.page.getByRole("region", { name: "Your application" })).toContainText("Pending");
    await expect(me.page.getByRole("button", { name: "Withdraw application" })).toBeVisible();

    // What the API holds: a creator-initiated pending application at the typed price, with the pitch.
    const token = await apiToken(request, creator.email);
    const offers = await request.get(`${API_MAIN}/creator/offers?limit=5`, { headers: cookie(token) });
    const mine = ((await offers.json()) as { data: { id: string; status: string; initiator: string; priceXaf: number; pitch: string; campaign: { id: string } }[] }).data.find((o) => o.campaign?.id === campaign.id)!;
    expect(mine).toMatchObject({ status: "pending", initiator: "creator", priceXaf: 90000, pitch: "I make honest beauty reels for Douala audiences." });

    // The inbox shows it as waiting for the brand; the brand sees the application and accepts it.
    await me.page.goto(`${APP}/creator/requests`);
    await expect(me.page.getByRole("article", { name: new RegExp(`Your application ${mine.id ? "HR-" : ""}`) })).toContainText("Waiting for the brand");
    await campaign.brand.page.goto(`${APP}/brand/offers`);
    const card = campaign.brand.page.getByRole("listitem").filter({ hasText: "Creator application" }).first();
    await expect(card).toContainText("I make honest beauty reels for Douala audiences.");
    await expect(card).toContainText("90,000 FCFA");
    campaign.brand.page.once("dialog", (dialog) => void dialog.accept());
    await card.getByRole("button", { name: "Accept application" }).click();
    await expect(campaign.brand.page.getByRole("listitem").filter({ hasText: "Creator application" }).first()).toContainText("Accepted");

    await me.page.goto(`${APP}/creator/requests`);
    await expect(me.page.getByRole("row").filter({ hasText: campaign.title })).toContainText("Accepted");
    const accepted = await request.get(`${API_MAIN}/creator/offers/${mine.id}`, { headers: cookie(token) });
    expect(((await accepted.json()) as { data: { offer: { status: string; window: { startDate: string; endDate: string } } } }).data.offer).toMatchObject({ status: "accepted", window: { startDate: "2072-03-01", endDate: "2072-03-15" } });
    await campaign.brand.context.close();
    await me.context.close();
  });

  test("withdrawing a pending application is real, and an application can never be sent twice", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const campaign = await openCampaign(request, browser);
    const creator = await approvedCreator(browser, request);
    const me = await creatorSession(browser, creator.email);
    await me.page.goto(`${APP}/creator/campaigns/${campaign.id}`);
    await me.page.getByLabel("Your pitch").fill("I make honest beauty reels for Douala audiences.");
    await me.page.getByRole("button", { name: "Send application" }).dblclick(); // two clicks, one application
    await expect(me.page.getByRole("region", { name: "Your application" })).toContainText("Pending");
    const token = await apiToken(request, creator.email);
    const list = async () => ((await (await request.get(`${API_MAIN}/creator/offers?limit=50`, { headers: cookie(token) })).json()) as { data: { status: string; campaign: { id: string } | null }[] }).data.filter((o) => o.campaign?.id === campaign.id);
    expect(await list()).toHaveLength(1);

    me.page.once("dialog", (dialog) => void dialog.accept());
    await me.page.getByRole("button", { name: "Withdraw application" }).click();
    await expect(me.page.getByRole("region", { name: "Your application" })).toContainText("Withdrawn");
    expect((await list())[0]!.status).toBe("withdrawn");
    await expect(me.page.getByLabel("Your pitch")).toHaveCount(0); // no way to apply again
    await expect(me.page.getByText(/can't apply to this campaign again/)).toBeVisible();
    // straight at the API: a second application is refused
    const again = await request.post(`${API_MAIN}/creator/campaigns/${campaign.id}/offers`, { headers: cookie(token), data: { platform: "instagram", priceXaf: 85000, pitch: "Trying again anyway, please." } });
    expect(again.status()).toBe(409);
    await campaign.brand.context.close();
    await me.context.close();
  });

  test("a pending application can also be withdrawn from the requests inbox", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const campaign = await openCampaign(request, browser);
    const creator = await approvedCreator(browser, request);
    const token = await apiToken(request, creator.email);
    const applied = await request.post(`${API_MAIN}/creator/campaigns/${campaign.id}/offers`, { headers: cookie(token), data: { platform: "instagram", priceXaf: 85000, pitch: "Applying straight through the API." } });
    expect(applied.status()).toBe(201);
    const offerId = ((await applied.json()) as { data: { offer: { id: string } } }).data.offer.id;
    const me = await creatorSession(browser, creator.email);
    me.page.once("dialog", (dialog) => void dialog.accept());
    await me.page.getByRole("button", { name: "Withdraw application" }).click();
    const statusOf = async () => ((await (await request.get(`${API_MAIN}/creator/offers/${offerId}`, { headers: cookie(token) })).json()) as { data: { offer: { status: string } } }).data.offer.status;
    await expect.poll(statusOf).toBe("withdrawn");
    await expect(me.page.getByRole("button", { name: /Withdraw/ })).toHaveCount(0);
    await campaign.brand.context.close();
    await me.context.close();
  });

  test("an engagement minimum the creator doesn't meet blocks applying, in the page and at the API", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const campaign = await openCampaign(request, browser, { minEngagementPct: 5 });
    const creator = await approvedCreator(browser, request); // the wizard collects no engagement rate
    const me = await creatorSession(browser, creator.email);
    await me.page.goto(`${APP}/creator/campaigns/${campaign.id}`);
    await expect(me.page.getByRole("note")).toContainText(/engagement rate is below this campaign's minimum/);
    await expect(me.page.getByLabel("Your pitch")).toHaveCount(0);
    const token = await apiToken(request, creator.email);
    const refused = await request.post(`${API_MAIN}/creator/campaigns/${campaign.id}/offers`, { headers: cookie(token), data: { platform: "instagram", priceXaf: 85000, pitch: "Applying despite the minimum." } });
    expect(refused.status()).toBe(422);
    await me.page.goto(`${APP}/creator/campaigns?eligible=true&q=${campaign.tag}`);
    await expect(me.page.getByText(/No open campaigns match/)).toBeVisible();
    await campaign.brand.context.close();
    await me.context.close();
  });

  test("campaigns that are not open are invisible and cannot be applied to", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const pending = await openCampaign(request, browser, {}, false); // submitted, not yet approved
    const creator = await approvedCreator(browser, request);
    const me = await creatorSession(browser, creator.email);
    await me.page.goto(`${APP}/creator/campaigns?q=${pending.tag}`);
    await expect(me.page.getByText(/No open campaigns match/)).toBeVisible();
    expect((await me.page.goto(`${APP}/creator/campaigns/${pending.id}`))!.status()).toBe(404);
    const token = await apiToken(request, creator.email);
    expect((await request.post(`${API_MAIN}/creator/campaigns/${pending.id}/offers`, { headers: cookie(token), data: { platform: "instagram", priceXaf: 85000, pitch: "Applying to something not open." } })).status()).toBe(404);
    expect((await me.page.goto(`${APP}/creator/campaigns/${encodeURIComponent("../admin")}`))!.status()).toBe(404);
    await pending.brand.context.close();
    await me.context.close();
  });

  test("a brand, a visitor and a pending creator cannot browse or apply", async ({ browser, page, request }) => {
    test.setTimeout(120_000);
    await page.goto(`${APP}/creator/campaigns`);
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcreator%2Fcampaigns/);
    const brand = await newBrandSession(browser);
    await brand.page.goto(`${APP}/creator/campaigns`);
    await expect(brand.page).toHaveURL(/denied=creator/);
    expect((await request.get(`${API_MAIN}/creator/campaigns`, { headers: cookie(brand.token) })).status()).toBe(403);
    await brand.context.close();
    const context = await browser.newContext();
    const pending = await context.newPage();
    await signIn(pending, ACCOUNTS.pendingCreator);
    await pending.goto(`${APP}/creator/campaigns`);
    await expect(pending).not.toHaveURL(`${APP}/creator/campaigns`);
    await context.close();
  });

  test("an ended session keeps the typed application and offers sign-in", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const campaign = await openCampaign(request, browser);
    const creator = await approvedCreator(browser, request);
    const me = await creatorSession(browser, creator.email);
    await me.page.goto(`${APP}/creator/campaigns/${campaign.id}`);
    await me.page.getByLabel("Your pitch").fill("I make honest beauty reels for Douala audiences.");
    await me.context.clearCookies();
    await me.page.getByRole("button", { name: "Send application" }).click();
    await expect(alertOf(me.page)).toContainText(/session has ended/i);
    await expect(me.page.getByRole("link", { name: "Sign in again" })).toBeVisible();
    await expect(me.page.getByLabel("Your pitch")).toHaveValue("I make honest beauty reels for Douala audiences.");
    const token = await apiToken(request, creator.email);
    const offers = await request.get(`${API_MAIN}/creator/offers?limit=50`, { headers: cookie(token) });
    expect(((await offers.json()) as { data: { campaign: { id: string } | null }[] }).data.some((o) => o.campaign?.id === campaign.id)).toBe(false);
    await campaign.brand.context.close();
    await me.context.close();
  });
});

test.describe("a platform invitation is not an application", () => {
  test("a creator the platform invited sees an invitation to answer in the inbox, with no application form and no Withdraw", async ({ browser, request }) => {
    test.setTimeout(180_000);
    const creator = await approvedCreator(browser, request);
    const token = await apiToken(request, creator.email);
    // A campaign aimed at Douala: the matching job (which runs once, when the campaign opens) invites this beauty creator from Douala.
    const campaign = await openCampaign(request, browser, { cities: ["douala"] });
    await expect.poll(async () => ((await (await request.get(`${API_MAIN}/creator/offers?limit=50`, { headers: cookie(token) })).json()) as { data: { campaign: { id: string } | null }[] }).data.some((o) => o.campaign?.id === campaign.id), { timeout: 90_000, intervals: [1000] }).toBe(true);
    const me = await creatorSession(browser, creator.email);
    await me.page.goto(`${APP}/creator/campaigns/${campaign.id}`);
    await expect(me.page.getByRole("region", { name: "Your invitation" })).toContainText("You were invited to this campaign");
    await expect(me.page.getByRole("button", { name: /Withdraw/ })).toHaveCount(0);
    await expect(me.page.getByLabel("Your pitch")).toHaveCount(0);
    await me.page.getByRole("link", { name: "Answer the invitation" }).click();
    await expect(me.page.getByRole("article", { name: /Platform invitation/ })).toContainText(campaign.title);
    await expect(me.page.getByRole("article", { name: /Platform invitation/ }).getByRole("button", { name: /Withdraw/ })).toHaveCount(0);
    // the API agrees: an invitation cannot be withdrawn, and the creator cannot apply on top of it
    const offers = (await (await request.get(`${API_MAIN}/creator/offers?limit=50`, { headers: cookie(token) })).json()) as { data: { id: string; initiator: string; campaign: { id: string } | null }[] };
    const invitation = offers.data.find((o) => o.campaign?.id === campaign.id)!;
    expect(invitation.initiator).toBe("platform");
    expect((await request.post(`${API_MAIN}/creator/offers/${invitation.id}/withdraw`, { headers: cookie(token), data: {} })).status()).toBeGreaterThanOrEqual(400);
    expect((await request.post(`${API_MAIN}/creator/campaigns/${campaign.id}/offers`, { headers: cookie(token), data: { platform: "instagram", priceXaf: 85000, pitch: "Applying on top of the invitation." } })).status()).toBe(409);
    await campaign.brand.context.close();
    await me.context.close();
  });
});
