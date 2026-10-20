import { expect, test } from "@playwright/test";
import type { APIRequestContext, Browser, BrowserContext } from "@playwright/test";
import { ACCOUNTS, API_MAIN, APP, apiToken, approvedCreator, collectBodies, newBrandSession, signIn, tokenOf, trackRequests } from "./helpers";

const cookie = (token: string) => ({ Cookie: `ioh_session=${token}`, "Content-Type": "application/json" });

/** A brand and creator, a hire the creator accepted, and the brand's simulated payment held in escrow (all through the real API). */
async function heldPayment(browser: Browser, request: APIRequestContext) {
  const creator = await approvedCreator(browser, request);
  const brand = await newBrandSession(browser);
  const hire = await request.post(`${API_MAIN}/brand/offers`, { headers: cookie(brand.token), data: { creator: creator.username, platform: "instagram", duration: "1-month", paymentMethod: "mtn_momo", contactName: "Jane Brand", location: "Douala" } });
  expect(hire.status()).toBe(201);
  const offerId = ((await hire.json()) as { data: { offer: { id: string } } }).data.offer.id;
  const creatorToken = await apiToken(request, creator.email);
  expect((await request.post(`${API_MAIN}/creator/offers/${offerId}/accept`, { headers: cookie(creatorToken), data: {} })).status()).toBe(200);
  const funded = await request.post(`${API_MAIN}/brand/offers/${offerId}/fund`, { headers: { ...cookie(brand.token), "Idempotency-Key": `pay-${offerId.slice(0, 20)}` }, data: { paymentMethod: "mtn_momo", payerPhone: "677123456" } });
  expect(funded.status()).toBe(201);
  const payment = ((await funded.json()) as { data: { funding: { payment: { id: string; reference: string } } } }).data.funding.payment;
  const creatorContext = await browser.newContext();
  const creatorPage = await creatorContext.newPage();
  await signIn(creatorPage, creator.email);
  await creatorPage.waitForURL(/\/creator/);
  return { creator, creatorToken, creatorContext, creatorPage, brand, offerId, paymentId: payment.id, reference: payment.reference };
}

type Booking = Awaited<ReturnType<typeof heldPayment>>;
const paymentOf = async (request: APIRequestContext, token: string, who: "brand" | "creator", id: string) =>
  ((await (await request.get(`${API_MAIN}/${who}/payments/${id}`, { headers: cookie(token) })).json()) as { data: { payment: Record<string, unknown> & { dispute?: { status: string } | null; delivery: { acknowledgedAt: string | null }; status: string; actions: Record<string, boolean> } } }).data.payment;
const report = (request: APIRequestContext, b: Booking) => request.post(`${API_MAIN}/creator/payments/${b.paymentId}/delivery-report`, { headers: cookie(b.creatorToken), data: { summary: "Posted the reel and three stories as agreed.", links: ["https://example.com/post/1"] } });

async function financeToken(browser: Browser): Promise<{ token: string; context: BrowserContext }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, ACCOUNTS.finance);
  await page.waitForURL(`${APP}/admin`);
  return { token: await tokenOf(context), context };
}

test.describe("creator payments and brand delivery decisions against the real API (simulated provider)", () => {
  test("the creator sees the frozen fee and net, reports delivery in the browser, the brand acknowledges, Finance releases to the SIMULATED balance which cannot be withdrawn", async ({ browser, request }) => {
    test.setTimeout(240_000);
    const b = await heldPayment(browser, request);
    const page = b.creatorPage;
    const requests = trackRequests(page);
    const bodies = collectBodies(page);
    page.on("dialog", (d) => void d.accept());

    await page.goto(`${APP}/creator/payments`);
    const item = page.getByRole("listitem").filter({ hasText: b.reference });
    await expect(item).toContainText("85,000 FCFA");
    await expect(item).toContainText("17,000 FCFA");
    await expect(item).toContainText("68,000 FCFA");
    await expect(item).toContainText("Simulated");
    await expect(item).toContainText("On hold");
    await expect(page.getByText("You have no withdrawable balance.")).toBeVisible();
    await expect(page.getByRole("button", { name: /request withdrawal/i })).toHaveCount(0);

    // Bad evidence is stopped before anything is sent.
    await item.getByRole("button", { name: "Submit delivery report" }).click();
    await item.getByRole("button", { name: "Send report" }).click();
    await expect(item.getByRole("alert")).toContainText("at least 20");
    await item.getByLabel("What did you deliver?").fill("Posted the reel and three stories as agreed.");
    await item.getByLabel(/Links to your posts/).fill("javascript:alert(1)");
    await item.getByRole("button", { name: "Send report" }).click();
    await expect(item.getByRole("alert")).toContainText("https");
    expect((await paymentOf(request, b.creatorToken, "creator", b.paymentId)).status).toBe("held");

    await item.getByLabel(/Links to your posts/).fill("https://example.com/post/1\nhttps://example.com/post/2");
    await item.getByRole("button", { name: "Send report" }).click();
    await expect(item.getByRole("status")).toContainText("not a payment");
    await expect.poll(async () => (await paymentOf(request, b.creatorToken, "creator", b.paymentId)).status).toBe("requested");
    await page.reload();
    await expect(page.getByRole("listitem").filter({ hasText: b.reference })).toContainText("Awaiting release");
    await expect(page.getByRole("button", { name: "Submit delivery report" })).toHaveCount(0);
    // A second report straight at the API is refused: the evidence is frozen.
    expect((await report(request, b)).status()).toBe(409);

    // The brand acknowledges in the browser.
    const brandPage = b.brand.page;
    brandPage.on("dialog", (d) => void d.accept());
    await brandPage.goto(`${APP}/brand/payments`);
    const row = brandPage.getByRole("row").filter({ hasText: b.reference });
    await expect(row).toContainText("The creator reported delivery");
    await expect(row).not.toContainText(/17,000|68,000/);
    await row.getByRole("button", { name: "Acknowledge delivery" }).click();
    await row.getByRole("button", { name: /^Confirm/ }).click();
    await expect(row.getByRole("status")).toContainText("Delivery acknowledged");
    await expect.poll(async () => (await paymentOf(request, b.brand.token, "brand", b.paymentId)).delivery.acknowledgedAt).not.toBeNull();
    await brandPage.reload();
    await expect(brandPage.getByRole("row").filter({ hasText: b.reference })).toContainText("You acknowledged this delivery");
    await expect(brandPage.getByRole("button", { name: "Dispute delivery" })).toHaveCount(0);

    // Finance releases (the brand and creator cannot).
    expect((await request.post(`${API_MAIN}/admin/payments/${b.paymentId}/release`, { headers: cookie(b.creatorToken), data: {} })).status()).toBe(403);
    expect((await request.post(`${API_MAIN}/admin/payments/${b.paymentId}/release`, { headers: cookie(b.brand.token), data: {} })).status()).toBe(403);
    const finance = await financeToken(browser);
    expect((await request.post(`${API_MAIN}/admin/payments/${b.paymentId}/release`, { headers: cookie(finance.token), data: {} })).status()).toBe(200);

    await page.goto(`${APP}/creator/payments`);
    await expect(page.getByRole("listitem").filter({ hasText: b.reference })).toContainText("Released to a simulated balance");
    await expect(page.getByText(/Simulated balance:/)).toContainText("68,000 FCFA");
    await expect(page.getByText("You have no withdrawable balance.")).toContainText("can't be withdrawn");
    await expect(page.getByRole("button", { name: /request withdrawal/i })).toHaveCount(0);

    // Straight at the API: nothing simulated can be withdrawn, and the wallet does not change.
    const attempt = await request.post(`${API_MAIN}/creator/withdrawals`, { headers: { ...cookie(b.creatorToken), "Idempotency-Key": `wd-sim-${b.offerId.slice(0, 16)}` }, data: { amountXaf: 5000, method: "mtn_momo" } });
    expect(attempt.status()).toBeGreaterThanOrEqual(400);
    const wallet = ((await (await request.get(`${API_MAIN}/creator/wallet`, { headers: cookie(b.creatorToken) })).json()) as { data: { wallet: Record<string, unknown> & { dispute?: { status: string } | null; delivery: { acknowledgedAt: string | null }; status: string; actions: Record<string, boolean> } } }).data.wallet;
    expect(wallet).toMatchObject({ availableXaf: 0, pendingWithdrawalsXaf: 0, simulated: { balanceXaf: 68000, withdrawable: false } });
    expect(((await (await request.get(`${API_MAIN}/creator/withdrawals`, { headers: cookie(b.creatorToken) })).json()) as { data: unknown[] }).data).toHaveLength(0);

    // The earnings page in the dashboard shows the same real data.
    await page.goto(`${APP}/creator/earnings`);
    await expect(page.getByRole("listitem").filter({ hasText: b.reference })).toContainText("68,000 FCFA");

    expect(requests.filter((u) => u.includes(":4100") || u.includes("/api/v1/"))).toEqual([]);
    for (const response of bodies) expect(response.text, response.url).not.toContain(b.creatorToken);
    await finance.context.close();
    await b.creatorContext.close();
    await b.brand.context.close();
  });

  test("a brand disputes a reported delivery; the creator sees it, Finance cannot release, and the brand can withdraw the dispute", async ({ browser, request }) => {
    test.setTimeout(240_000);
    const b = await heldPayment(browser, request);
    expect((await report(request, b)).status()).toBe(200);
    const brandPage = b.brand.page;
    brandPage.on("dialog", (d) => void d.accept());
    await brandPage.goto(`${APP}/brand/payments`);
    const row = brandPage.getByRole("row").filter({ hasText: b.reference });
    await row.getByRole("button", { name: "Dispute delivery" }).click();
    await row.getByRole("button", { name: /^Confirm/ }).click();
    await expect(row.locator("#decision-text")).toBeVisible(); // a reason is required
    await row.getByRole("button", { name: /^Confirm/ }).click();
    await expect(row.getByText(/at least 5 characters/)).toBeVisible();
    expect((await paymentOf(request, b.brand.token, "brand", b.paymentId)).dispute).toBeNull();
    await row.locator("#decision-text").fill("The agreed stories were never posted.");
    await row.getByRole("button", { name: /^Confirm/ }).click();
    await expect(row.getByRole("status")).toContainText("Dispute opened");
    await expect.poll(async () => (await paymentOf(request, b.brand.token, "brand", b.paymentId)).dispute?.status).toBe("open");

    await b.creatorPage.goto(`${APP}/creator/payments`);
    const item = b.creatorPage.getByRole("listitem").filter({ hasText: b.reference });
    await expect(item).toContainText("Disputed");
    await expect(item).toContainText("The agreed stories were never posted.");
    await expect(item).toContainText("stays in escrow");

    const finance = await financeToken(browser);
    expect((await request.post(`${API_MAIN}/admin/payments/${b.paymentId}/release`, { headers: cookie(finance.token), data: {} })).status()).toBe(409);

    await brandPage.reload();
    const again = brandPage.getByRole("row").filter({ hasText: b.reference });
    await expect(again).toContainText("You disputed this delivery");
    await expect(brandPage.getByRole("button", { name: "Acknowledge delivery" })).toHaveCount(0);
    await again.getByRole("button", { name: "Withdraw dispute" }).click();
    await again.getByRole("button", { name: /^Confirm/ }).click();
    await expect(again.getByRole("status")).toContainText("Dispute withdrawn");
    // a withdrawn dispute is history: the payment has no current dispute and the brand may dispute again while the window is open
    await expect.poll(async () => (await paymentOf(request, b.brand.token, "brand", b.paymentId)).dispute).toBeNull();
    expect((await paymentOf(request, b.brand.token, "brand", b.paymentId)).actions).toMatchObject({ canWithdrawDispute: false, canDispute: true });
    await finance.context.close();
    await b.creatorContext.close();
    await b.brand.context.close();
  });

  test("a refund review request before the grace period is refused in plain words, creates nothing, and the lists stay separate", async ({ browser, request }) => {
    test.setTimeout(180_000);
    const b = await heldPayment(browser, request);
    const brandPage = b.brand.page;
    await brandPage.goto(`${APP}/brand/payments`);
    const row = brandPage.getByRole("row").filter({ hasText: b.reference });
    await row.getByRole("button", { name: "Request refund review" }).click();
    await expect(row.getByText(/not a refund/i)).toBeVisible();
    await row.locator("#decision-text").fill("The creator has not started the work.");
    await row.getByRole("button", { name: /^Confirm/ }).click();
    await expect(row.getByRole("alert")).toContainText("grace period");
    await expect(row.getByRole("alert")).toContainText("Nothing was changed");
    const list = await request.get(`${API_MAIN}/brand/refund-requests`, { headers: cookie(b.brand.token) });
    expect(((await list.json()) as { data: unknown[] }).data).toHaveLength(0);
    await expect(brandPage.getByText("No refund review requests.")).toBeVisible();
    expect((await paymentOf(request, b.brand.token, "brand", b.paymentId)).status).toBe("held");
    await b.creatorContext.close();
    await b.brand.context.close();
  });

  test("each side is kept to its own pages and its own data", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const b = await heldPayment(browser, request);
    // A brand cannot open the creator payments page; a creator cannot open the brand one.
    await b.brand.page.goto(`${APP}/creator/payments`);
    await expect(b.brand.page).not.toHaveURL(/\/creator\/payments/);
    await b.creatorPage.goto(`${APP}/brand/payments`);
    await expect(b.creatorPage).not.toHaveURL(/\/brand\/payments/);
    // Another account's payment is simply not found, and roles are enforced by the API itself.
    const other = await heldPayment(browser, request);
    expect((await request.get(`${API_MAIN}/creator/payments/${b.paymentId}`, { headers: cookie(other.creatorToken) })).status()).toBe(404);
    expect((await request.post(`${API_MAIN}/creator/payments/${b.paymentId}/delivery-report`, { headers: cookie(other.creatorToken), data: { summary: "Posted the reel and three stories as agreed.", links: ["https://example.com/p"] } })).status()).toBe(404);
    expect((await request.post(`${API_MAIN}/brand/payments/${b.paymentId}/acknowledge-delivery`, { headers: cookie(other.brand.token), data: {} })).status()).toBe(404);
    expect((await request.post(`${API_MAIN}/brand/payments/${b.paymentId}/acknowledge-delivery`, { headers: cookie(b.creatorToken), data: {} })).status()).toBe(403);
    // The brand's payment view never carries the fee or the creator's net.
    expect(await paymentOf(request, b.brand.token, "brand", b.paymentId)).not.toHaveProperty("netXaf");
    for (const x of [b, other]) {
      await x.creatorContext.close();
      await x.brand.context.close();
    }
  });
});
