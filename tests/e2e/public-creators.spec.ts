import { expect, test } from "@playwright/test";
import type { APIRequestContext, Browser } from "@playwright/test";
import { ACCOUNTS, API_MAIN, APP, approvedCreator, collectBodies, managerToken, newBrandSession, signIn, tokenOf, trackRequests } from "./helpers";

type ApiCard = { username: string; displayName: string; startingPriceXaf: number; city: { slug: string }; followers: { total: number } };

const cookie = (token: string) => ({ Cookie: `ioh_session=${token}`, "Content-Type": "application/json" });

async function publicList(request: APIRequestContext, query = ""): Promise<{ data: ApiCard[]; meta: { nextCursor: string | null } }> {
  const response = await request.get(`${API_MAIN}/public/creators?${query}`);
  expect(response.status()).toBe(200);
  return (await response.json()) as { data: ApiCard[]; meta: { nextCursor: string | null } };
}

/** A fresh, approved creator whose display name carries a unique tag, so searches find exactly it. */
async function taggedCreator(browser: Browser, request: APIRequestContext) {
  const creator = await approvedCreator(browser, request);
  return { ...creator, search: creator.username };
}

test.describe("public creator pages against the real API (anonymous visitors)", () => {
  test("an anonymous visitor browses real creators, sees only public facts, and nothing private reaches the browser", async ({ page, request, browser }) => {
    test.setTimeout(120_000);
    const creator = await taggedCreator(browser, request);
    const requests = trackRequests(page);
    const bodies = collectBodies(page);

    await page.goto(`${APP}/influencers?q=${encodeURIComponent(creator.username)}`);
    const card = page.getByRole("article").filter({ hasText: "Amina Beauty" });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("Beauty");
    await expect(card).toContainText("Douala");
    await expect(card).toContainText("From 85,000 CFA");
    await expect(card).toContainText("No reviews yet");
    await expect(card.getByRole("link", { name: "Details" })).toHaveAttribute("href", `/influencers/${creator.username}`);
    await expect(card.getByRole("link", { name: "Hire" })).toHaveAttribute("href", `/influencers/${creator.username}/hire`);

    // The page shows what the API publishes for that creator.
    const api = (await publicList(request, `q=${encodeURIComponent(creator.username)}`)).data;
    expect(api).toHaveLength(1);
    expect(api[0]).toMatchObject({ displayName: "Amina Beauty", startingPriceXaf: 85000, city: { slug: "douala" } });

    // Nothing private reaches the browser: not the creator's e-mail, phone, id or payout number, and no photo or payment method.
    const text = (await page.locator("body").innerText()) + bodies.map((b) => b.text).join("\n");
    expect(text).not.toContain(creator.email);
    expect(text).not.toContain("677123456");
    expect(text).not.toMatch(/photoFileId|depositTerms|acceptedPaymentMethods|payoutMethods|MTN MoMo|Orange Money/);
    expect(requests.filter((url) => url.includes(":4100") || url.includes("/api/v1/"))).toEqual([]);
  });

  test("the profile shows the public fields and links to the real hire flow; the browser holds no session", async ({ page, context, request, browser }) => {
    test.setTimeout(120_000);
    const creator = await taggedCreator(browser, request);
    await page.goto(`${APP}/influencers/${creator.username}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Amina Beauty");
    await expect(page.getByText(/short beauty reels/)).toBeVisible();
    await expect(page.getByText("MTN Cameroon")).toBeVisible();
    await expect(page.getByText(/@amina.beauty · 25K followers/)).toBeVisible();
    await expect(page.getByText("85,000 CFA").first()).toBeVisible();
    await expect(page.getByText(/Minimum booking:/)).toBeVisible();
    await expect(page.getByText("This creator hasn't shared an engagement rate.")).toBeVisible(); // the wizard collects none: shown as missing, not invented
    await expect(page.locator("main")).not.toContainText(/Payment Methods|deposit|escrow|Bank transfer/i); // (the site footer links to its Escrow Policy; the profile itself says nothing of payments)
    expect((await context.cookies()).find((c) => c.name === "ioh_session")).toBeUndefined();

    // The API's own public profile has exactly the allowlisted keys.
    const response = await request.get(`${API_MAIN}/public/creators/${creator.username}`);
    const profile = ((await response.json()) as { data: { creator: Record<string, unknown> } }).data.creator;
    expect(Object.keys(profile)).not.toEqual(expect.arrayContaining(["photoFileId", "acceptedPaymentMethods"]));
    expect(JSON.stringify(profile)).not.toMatch(/depositTerms|photoFileId|acceptedPaymentMethods|email|phone|last3/);
  });

  test("filters, search and sorting work from the URL and from the page, and unknown values are ignored", async ({ page, request }) => {
    test.setTimeout(90_000);
    // Filter by a city through the interface: the URL carries it and every result is in that city.
    await page.goto(`${APP}/influencers`);
    await page.getByRole("complementary", { name: "Filter influencers" }).getByRole("button", { name: "Douala" }).click();
    await expect(page).toHaveURL(/location=douala/);
    await expect(page.getByRole("article").first()).toContainText("Douala");
    const api = await publicList(request, "city=douala&limit=12");
    expect(await page.getByRole("article").count()).toBe(api.data.length);

    // Sorting by price: the page order is the API's order.
    await page.goto(`${APP}/influencers?sort=price_asc`);
    const asc = await page.getByRole("article").locator("h3").allInnerTexts();
    expect(asc.length).toBeGreaterThan(0);
    const apiAsc = await publicList(request, "sort=price_asc&limit=12");
    expect(asc).toEqual(apiAsc.data.map((c) => c.displayName));

    // Hostile or unknown parameters are dropped instead of being forwarded: the page still renders the normal list.
    const hostile = await page.goto(`${APP}/influencers?sort=password_hash&role=admin&status=pending&niche=${encodeURIComponent("beauty;drop table")}&followers=999&cursor=${encodeURIComponent("../x?y=1")}`);
    expect(hostile!.status()).toBe(200);
    await expect(page.getByRole("article").first()).toBeVisible();

    // A search with no match is an honest empty state.
    await page.goto(`${APP}/influencers?q=zzzzqqqq`);
    await expect(page.getByText("No influencers match these filters")).toBeVisible();
  });

  test("paging follows the API's cursor and never repeats a creator", async ({ page, request }) => {
    test.setTimeout(90_000);
    const total = (await publicList(request, "limit=24")).data.length;
    test.skip(total <= 12, "needs more creators than one page");
    await page.goto(`${APP}/influencers?sort=newest`);
    const first = await page.getByRole("article").locator("h3").count();
    expect(first).toBe(12);
    await page.getByRole("link", { name: "Show more influencers" }).click();
    await expect(page).toHaveURL(/cursor=/);
    await expect(page.getByRole("link", { name: "Back to the first page" })).toBeVisible();
    const hrefs = await page.getByRole("article").getByRole("link", { name: "Details" }).evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    const firstPage = await publicList(request, "sort=newest&limit=12");
    const firstHrefs = firstPage.data.map((c) => `/influencers/${c.username}`);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(firstHrefs).not.toContain(href);
  });

  test("an unknown username, a reserved word and a malformed one are the normal 'not found' page", async ({ page }) => {
    for (const name of ["nobody.at.all", "filters", "..%2F..%2Fadmin", "a"]) {
      const response = await page.goto(`${APP}/influencers/${name}`);
      expect(response!.status(), name).toBe(404);
    }
  });

  test("a suspended creator disappears from the directory and the profile at once, and returns when reactivated", async ({ page, request, browser }) => {
    test.setTimeout(150_000);
    const creator = await taggedCreator(browser, request);
    const admin = await managerToken(request);
    const me = await request.get(`${API_MAIN}/admin/users?q=${encodeURIComponent(creator.email.slice(0, 20))}&limit=5`, { headers: cookie(admin) });
    const id = ((await me.json()) as { data: { id: string; email: string }[] }).data.find((u) => u.email === creator.email)!.id;

    await page.goto(`${APP}/influencers/${creator.username}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Amina Beauty");
    expect((await request.post(`${API_MAIN}/admin/users/${id}/suspend`, { headers: cookie(admin), data: {} })).status()).toBe(200);
    expect((await page.goto(`${APP}/influencers/${creator.username}`))!.status()).toBe(404);
    await page.goto(`${APP}/influencers?q=${encodeURIComponent(creator.username)}`);
    await expect(page.getByText("No influencers match these filters")).toBeVisible();
    expect((await request.post(`${API_MAIN}/admin/users/${id}/reactivate`, { headers: cookie(admin), data: {} })).status()).toBe(200);
    expect((await page.goto(`${APP}/influencers/${creator.username}`))!.status()).toBe(200);
  });

  test("a pending creator (application not approved) is not discoverable", async ({ page, request }) => {
    const pending = await request.get(`${API_MAIN}/public/creators/${ACCOUNTS.pendingCreator.split("@")[0]}`);
    expect(pending.status()).toBe(404);
    const everyone = (await publicList(request, "limit=24")).data.map((c) => c.username);
    expect(everyone.some((name) => name.includes("pending"))).toBe(false);
    expect((await page.goto(`${APP}/influencers/pending.creator`))!.status()).toBe(404);
  });

  test("the home page lists real recommended creators", async ({ page, request }) => {
    await page.goto(`${APP}/`);
    const recommended = (await publicList(request, "sort=recommended&limit=6")).data;
    const names = await page.locator("section").filter({ hasText: "Featured talent" }).getByRole("article").locator("h3").allInnerTexts();
    expect(names).toEqual(recommended.map((c) => c.displayName));
    await expect(page.locator("body")).not.toContainText(/most sought-after|Verified influencers with proven reach/);
  });
});

test.describe("from a public profile into the real hire flow", () => {
  test("an anonymous visitor who presses Hire is sent to sign in and back to the hire form, and a brand completes the hire", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const creator = await taggedCreator(browser, request);
    const brand = await newBrandSession(browser);
    // A brand-new anonymous browser opens the profile and presses Hire.
    const visitor = await browser.newContext();
    const page = await visitor.newPage();
    await page.goto(`${APP}/influencers/${creator.username}`);
    await page.getByRole("link", { name: "Hire Amina" }).click();
    await expect(page).toHaveURL(new RegExp(`/sign-in\\?next=%2Finfluencers%2F${creator.username.replace(/\./g, "\\.")}%2Fhire`));

    // The signed-in brand reaches the same form from the profile and sends a real request at the creator's listed rate.
    await brand.page.goto(`${APP}/influencers/${creator.username}`);
    await brand.page.getByRole("link", { name: "Hire Amina" }).click();
    await expect(brand.page).toHaveURL(`${APP}/influencers/${creator.username}/hire`);
    await expect(brand.page.getByLabel(/Platform/).locator("option")).toHaveText(["Instagram · 85,000 FCFA"]);
    await brand.page.getByLabel(/Your Full Name/).fill("Jane Brand");
    await brand.page.getByLabel(/Location/).fill("Douala");
    await brand.page.getByRole("button", { name: "Submit Hire Request" }).click();
    await expect(brand.page.getByRole("heading", { name: "Hire request sent" })).toBeVisible();
    const offers = await request.get(`${API_MAIN}/brand/offers?limit=5`, { headers: cookie(brand.token) });
    expect(((await offers.json()) as { data: { priceXaf: number; creator: { username: string } }[] }).data[0]).toMatchObject({ priceXaf: 85000, creator: { username: creator.username } });
    await visitor.close();
    await brand.context.close();
  });

  test("a creator who presses Hire on a profile is turned away from the brand-only form", async ({ browser, request }) => {
    test.setTimeout(120_000);
    const creator = await taggedCreator(browser, request);
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.activeCreator);
    await page.waitForURL(/\/creator\/requests$/);
    await page.goto(`${APP}/influencers/${creator.username}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Amina Beauty"); // public pages are open to everyone
    await page.getByRole("link", { name: "Hire Amina" }).click();
    await expect(page).not.toHaveURL(`${APP}/influencers/${creator.username}/hire`);
    expect(await tokenOf(context)).toBeTruthy();
    await context.close();
  });
});
