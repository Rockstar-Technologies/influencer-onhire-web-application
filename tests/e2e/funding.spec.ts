import { expect, test } from "@playwright/test";
import type { APIRequestContext, Browser, BrowserContext, Page } from "@playwright/test";
import { ACCOUNTS, API_MAIN, APP, alertOf, apiToken, approvedCreator, collectBodies, newBrandSession, signIn, tokenOf, trackRequests } from "./helpers";

type ApiFunding = { offerId: string; amountXaf: number; status: string; canStart: boolean; simulated: boolean; payment: { reference: string; status: string } | null; attempts: { confirmation: string; simulated: boolean }[] };

const cookie = (token: string) => ({ Cookie: `ioh_session=${token}`, "Content-Type": "application/json" });

async function fundingOf(request: APIRequestContext, token: string, offerId: string): Promise<ApiFunding> {
  const response = await request.get(`${API_MAIN}/brand/offers/${offerId}/funding`, { headers: cookie(token) });
  expect(response.status()).toBe(200);
  return ((await response.json()) as { data: { funding: ApiFunding } }).data.funding;
}

/** A brand-new brand and creator with a hire the creator already accepted (all through the real API), ready to be paid for. */
async function acceptedBooking(browser: Browser, request: APIRequestContext) {
  const creator = await approvedCreator(browser, request);
  const brand = await newBrandSession(browser);
  const hire = await request.post(`${API_MAIN}/brand/offers`, {
    headers: cookie(brand.token),
    data: { creator: creator.username, platform: "instagram", duration: "1-month", paymentMethod: "mtn_momo", contactName: "Jane Brand", location: "Douala" },
  });
  expect(hire.status()).toBe(201);
  const offerId = ((await hire.json()) as { data: { offer: { id: string } } }).data.offer.id;
  const creatorToken = await apiToken(request, creator.email);
  expect((await request.post(`${API_MAIN}/creator/offers/${offerId}/accept`, { headers: cookie(creatorToken), data: {} })).status()).toBe(200);
  return { creator, creatorToken, brand, offerId, payPage: `${APP}/brand/offers/${offerId}/fund` };
}

async function payWith(page: Page, phone: string) {
  await page.getByLabel(/The number you're paying from/).fill(phone);
  await page.getByRole("button", { name: /^Pay / }).click();
}

const status = (page: Page) => page.getByTestId("fund-status");

test.describe("funding an accepted booking against the real API (simulated provider, development only)", () => {
  test("the brand pays the offer's price into escrow; it is held and simulated; the fee split is frozen at 20/80", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const booking = await acceptedBooking(browser, request);
    const { page } = booking.brand;
    const requests = trackRequests(page);
    const bodies = collectBodies(page);

    await page.goto(`${APP}/brand/offers`);
    const card = page.getByRole("listitem").filter({ hasText: "HR-" }).first();
    await expect(card.getByTestId("funding-state")).toContainText("Not paid yet");
    await card.getByRole("link", { name: "Pay for this booking" }).click();
    await expect(page).toHaveURL(booking.payPage);

    // The amount is the API's, not editable, and the brand never sees fee or net.
    await expect(page.getByTestId("fund-amount")).toHaveText("85,000 FCFA");
    await expect(page.locator('input[type="number"], input[name="amount"]')).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(/platform fee|80%|20%/i);
    await payWith(page, "677 123 456");

    await expect(status(page)).toHaveText("Paid and held in escrow");
    await expect(page.getByTestId("simulated-note")).toContainText("No real money moved");
    await expect(page.getByRole("button", { name: /^Pay / })).toHaveCount(0);

    // What the API holds: one confirmed attempt, one held payment of exactly the offer price, labelled simulated.
    const funding = await fundingOf(request, booking.brand.token, booking.offerId);
    expect(funding).toMatchObject({ status: "funded", amountXaf: 85000, simulated: true, canStart: false, payment: { status: "held" } });
    expect(funding.attempts).toHaveLength(1);
    expect(funding.attempts[0]).toMatchObject({ confirmation: "succeeded", simulated: true });

    // The creator's own view of the same payment shows the frozen 20% fee and 80% net; the brand's view has neither.
    const creatorPayments = await request.get(`${API_MAIN}/creator/payments`, { headers: cookie(booking.creatorToken) });
    const mine = ((await creatorPayments.json()) as { data: { amountXaf: number; feeXaf: number; netXaf: number; feeRatePct: number; simulated: boolean }[] }).data;
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ amountXaf: 85000, feeXaf: 17000, netXaf: 68000, feeRatePct: 20, simulated: true });
    const brandPayments = await request.get(`${API_MAIN}/brand/payments`, { headers: cookie(booking.brand.token) });
    const theirs = ((await brandPayments.json()) as { data: Record<string, unknown>[] }).data;
    expect(theirs).toHaveLength(1);
    expect(theirs[0]).not.toHaveProperty("feeXaf");
    expect(theirs[0]).not.toHaveProperty("netXaf");

    // It survives a reload, shows in the hires list and on the payments page, and both parties were notified.
    await page.reload();
    await expect(status(page)).toHaveText("Paid and held in escrow");
    await page.goto(`${APP}/brand/offers`);
    await expect(page.getByTestId("funding-state").first()).toContainText("Paid and held in escrow");
    await page.goto(`${APP}/brand/payments`);
    const row = page.getByRole("row").filter({ hasText: funding.payment!.reference });
    await expect(row).toContainText("85,000 FCFA");
    await expect(row).toContainText("Simulated");
    await expect(row).toContainText("Direct hire");
    const notified = async (token: string) => {
      const res = await request.get(`${API_MAIN}/notifications?limit=50`, { headers: cookie(token) });
      return ((await res.json()) as { data: { type: string }[] }).data.map((n) => n.type);
    };
    expect(await notified(booking.brand.token)).toContain("payment_held");
    expect(await notified(booking.creatorToken)).toContain("payment_held");

    expect(requests.filter((url) => url.includes(":4100") || url.includes("/api/v1/"))).toEqual([]);
    for (const response of bodies) expect(response.text, response.url).not.toContain(booking.brand.token);
    await booking.brand.context.close();
  });

  test("a refused payment shows nothing as paid, then a retry with a new attempt succeeds", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const booking = await acceptedBooking(browser, request);
    const { page } = booking.brand;
    await page.goto(booking.payPage);
    await payWith(page, "670 000 001"); // the reserved number the simulation refuses
    await expect(status(page)).toHaveText("Payment not completed");
    await expect(page.getByRole("status")).toContainText("nothing was taken");
    expect((await fundingOf(request, booking.brand.token, booking.offerId))).toMatchObject({ status: "failed", canStart: true, payment: null });
    expect((await request.get(`${API_MAIN}/brand/payments`, { headers: cookie(booking.brand.token) }).then((r) => r.json()) as { data: unknown[] }).data).toHaveLength(0);

    await page.getByLabel(/The number you're paying from/).fill("677 123 456");
    await page.getByRole("button", { name: /^Pay / }).click();
    await expect(status(page)).toHaveText("Paid and held in escrow");
    const funding = await fundingOf(request, booking.brand.token, booking.offerId);
    expect(funding.attempts.map((a) => a.confirmation).sort()).toEqual(["failed", "succeeded"]);
    await booking.brand.context.close();
  });

  test("a payment that is not confirmed stays 'waiting': no payment exists, a second attempt is blocked, and the status can be re-checked", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const booking = await acceptedBooking(browser, request);
    const { page } = booking.brand;
    await page.goto(booking.payPage);
    await payWith(page, "670 000 003"); // stays pending at the (simulated) provider
    await expect(status(page)).toHaveText("Waiting for confirmation");
    await expect(page.getByRole("status")).toContainText("Nothing is paid until the payment provider confirms");
    await expect(page.locator("body")).not.toContainText("Paid and held");
    await expect(page.getByRole("button", { name: /^Pay / })).toHaveCount(0);
    expect(await fundingOf(request, booking.brand.token, booking.offerId)).toMatchObject({ status: "awaiting_confirmation", payment: null });

    // A second attempt straight at the API is refused: the first might still succeed.
    const second = await request.post(`${API_MAIN}/brand/offers/${booking.offerId}/fund`, { headers: { ...cookie(booking.brand.token), "Idempotency-Key": "second-attempt-key-1" }, data: { paymentMethod: "mtn_momo", payerPhone: "677123456" } });
    expect(second.status()).toBe(409);
    expect(((await second.json()) as { error: { code: string } }).error.code).toBe("funding_in_progress");

    await page.getByRole("button", { name: "Check status" }).click();
    await expect(status(page)).toHaveText("Waiting for confirmation");
    await expect(page.getByRole("button", { name: "Check status" })).toBeVisible();
    await booking.brand.context.close();
  });

  test("an unclear answer from the provider blocks a second payment and says the first may still go through", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const booking = await acceptedBooking(browser, request);
    const { page } = booking.brand;
    await page.goto(booking.payPage);
    await payWith(page, "670 000 002");
    await expect(status(page)).toHaveText("Confirmation unclear");
    await expect(page.getByRole("status")).toContainText("can't start a second one");
    await expect(page.getByRole("button", { name: /^Pay / })).toHaveCount(0);
    expect((await fundingOf(request, booking.brand.token, booking.offerId)).payment).toBeNull();
    await booking.brand.context.close();
  });

  test("a double click on Pay starts exactly one payment attempt", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const booking = await acceptedBooking(browser, request);
    const { page } = booking.brand;
    await page.goto(booking.payPage);
    await page.getByLabel(/The number you're paying from/).fill("677 123 456");
    await page.getByRole("button", { name: /^Pay / }).dblclick();
    await expect(status(page)).toHaveText("Paid and held in escrow");
    const funding = await fundingOf(request, booking.brand.token, booking.offerId);
    expect(funding.attempts).toHaveLength(1);
    expect((await request.get(`${API_MAIN}/brand/payments`, { headers: cookie(booking.brand.token) }).then((r) => r.json()) as { data: unknown[] }).data).toHaveLength(1);
    await booking.brand.context.close();
  });

  test("the same Idempotency-Key repeated at the API replays instead of charging again", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const booking = await acceptedBooking(browser, request);
    const send = () => request.post(`${API_MAIN}/brand/offers/${booking.offerId}/fund`, { headers: { ...cookie(booking.brand.token), "Idempotency-Key": "replay-key-0123456789" }, data: { paymentMethod: "mtn_momo", payerPhone: "677123456" } });
    const first = await send();
    const again = await send();
    expect(first.status()).toBe(201);
    expect(again.status()).toBe(200);
    expect(((await again.json()) as { data: { replayed: boolean } }).data.replayed).toBe(true);
    expect((await fundingOf(request, booking.brand.token, booking.offerId)).attempts).toHaveLength(1);
    await booking.brand.context.close();
  });

  test("a booking that is not accepted cannot be paid, and the page offers no form", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const creator = await approvedCreator(browser, request);
    const brand = await newBrandSession(browser);
    const hire = await request.post(`${API_MAIN}/brand/offers`, { headers: cookie(brand.token), data: { creator: creator.username, platform: "instagram", duration: "1-month", paymentMethod: "mtn_momo", contactName: "Jane Brand", location: "Douala" } });
    const offerId = ((await hire.json()) as { data: { offer: { id: string } } }).data.offer.id;
    await brand.page.goto(`${APP}/brand/offers/${offerId}/fund`);
    await expect(status(brand.page)).toHaveText("Not paid yet");
    await expect(brand.page.getByRole("button", { name: /^Pay / })).toHaveCount(0);
    const direct = await request.post(`${API_MAIN}/brand/offers/${offerId}/fund`, { headers: { ...cookie(brand.token), "Idempotency-Key": "not-accepted-key-1" }, data: { paymentMethod: "mtn_momo", payerPhone: "677123456" } });
    expect(direct.status()).toBe(409);
    expect(((await direct.json()) as { error: { code: string } }).error.code).toBe("offer_not_fundable");
    await brand.context.close();
  });
});

test.describe("who may pay, and what an ended session does", () => {
  test("another brand, a creator and an anonymous visitor cannot reach or use someone else's payment page", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const booking = await acceptedBooking(browser, request);

    const other = await newBrandSession(browser);
    const response = await other.page.goto(booking.payPage);
    expect(response!.status()).toBe(404);
    await expect(other.page.locator("body")).not.toContainText("85,000");
    const direct = await request.post(`${API_MAIN}/brand/offers/${booking.offerId}/fund`, { headers: { ...cookie(other.token), "Idempotency-Key": "stranger-key-0123456" }, data: { paymentMethod: "mtn_momo", payerPhone: "677123456" } });
    expect(direct.status()).toBe(404);
    expect((await request.get(`${API_MAIN}/brand/offers/${booking.offerId}/funding`, { headers: cookie(other.token) })).status()).toBe(404);
    expect((await fundingOf(request, booking.brand.token, booking.offerId)).attempts).toHaveLength(0);
    await other.context.close();

    const anon = await browser.newContext();
    const anonPage = await anon.newPage();
    await anonPage.goto(booking.payPage);
    await expect(anonPage).toHaveURL(/\/sign-in\?next=%2Fbrand%2Foffers%2F/);
    await anon.close();

    const creatorContext = await browser.newContext();
    const creatorPage = await creatorContext.newPage();
    await signIn(creatorPage, booking.creator.email);
    await creatorPage.waitForURL(/\/creator\/requests$/);
    await creatorPage.goto(booking.payPage);
    await expect(creatorPage).not.toHaveURL(booking.payPage);
    await creatorContext.close();

    const odd = await booking.brand.page.goto(`${APP}/brand/offers/${encodeURIComponent("../admin")}/fund`);
    expect(odd!.status()).toBe(404);
    await booking.brand.context.close();
  });

  test("an ended session keeps the form, says the request may have been sent and offers sign-in", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const booking = await acceptedBooking(browser, request);
    const { page, context } = booking.brand;
    await page.goto(booking.payPage);
    await page.getByLabel(/The number you're paying from/).fill("677 123 456");
    await context.clearCookies();
    await page.getByRole("button", { name: /^Pay / }).click();
    await expect(alertOf(page)).toContainText(/check its status/);
    await expect(page.getByRole("link", { name: "Sign in again" })).toBeVisible();
    await expect(page.getByLabel(/The number you're paying from/)).toHaveValue("677 123 456");
    await expect(page.locator("body")).not.toContainText("Paid and held");
    expect((await fundingOf(request, await apiToken(request, booking.brand.email), booking.offerId)).payment).toBeNull();
    await context.close();
  });

  test("the old mock payment screens are gone: /brand/campaign-payments leads to the real payments page", async ({ browser }) => {
    const context: BrowserContext = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.brand);
    await page.waitForURL(`${APP}/brand/payments`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Payments & Escrow");
    await expect(page.locator("body")).not.toContainText(/Pay for a campaign|Total Deposited|Summer Glow Launch/);
    await page.goto(`${APP}/brand/campaign-payments`);
    await expect(page).toHaveURL(`${APP}/brand/payments`);
    expect(await tokenOf(context)).toBeTruthy();
    await context.close();
  });
});
