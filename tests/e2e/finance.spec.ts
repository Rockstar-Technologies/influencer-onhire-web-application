import { expect, test } from "@playwright/test";
import type { APIRequestContext, Browser, BrowserContext, Page } from "@playwright/test";
import { ACCOUNTS, API_MAIN, APP, apiToken, approvedCreator, collectBodies, newBrandSession, signIn, tokenOf, trackRequests } from "./helpers";

const cookie = (token: string) => ({ Cookie: `ioh_session=${token}`, "Content-Type": "application/json" });
type Json = Record<string, unknown> & { dispute?: { status: string; awaitingPolicyDecision: boolean; outcome?: { status: string; proposedBy: string } | null } | null; actions: Record<string, boolean>; status: string };

async function heldPayment(browser: Browser, request: APIRequestContext) {
  const creator = await approvedCreator(browser, request);
  const brand = await newBrandSession(browser);
  const hire = await request.post(`${API_MAIN}/brand/offers`, { headers: cookie(brand.token), data: { creator: creator.username, platform: "instagram", duration: "1-month", paymentMethod: "mtn_momo", contactName: "Jane Brand", location: "Douala" } });
  expect(hire.status()).toBe(201);
  const offerId = ((await hire.json()) as { data: { offer: { id: string } } }).data.offer.id;
  const creatorToken = await apiToken(request, creator.email);
  expect((await request.post(`${API_MAIN}/creator/offers/${offerId}/accept`, { headers: cookie(creatorToken), data: {} })).status()).toBe(200);
  const funded = await request.post(`${API_MAIN}/brand/offers/${offerId}/fund`, { headers: { ...cookie(brand.token), "Idempotency-Key": `fin-${offerId.slice(0, 20)}` }, data: { paymentMethod: "mtn_momo", payerPhone: "677123456" } });
  expect(funded.status()).toBe(201);
  const payment = ((await funded.json()) as { data: { funding: { payment: { id: string; reference: string } } } }).data.funding.payment;
  return { creatorToken, brand, offerId, paymentId: payment.id, reference: payment.reference };
}
type Booking = Awaited<ReturnType<typeof heldPayment>>;

const report = (request: APIRequestContext, b: Booking) => request.post(`${API_MAIN}/creator/payments/${b.paymentId}/delivery-report`, { headers: cookie(b.creatorToken), data: { summary: "Posted the reel and three stories as agreed.", links: ["https://example.com/post/1"] } });
const dispute = (request: APIRequestContext, b: Booking) => request.post(`${API_MAIN}/brand/payments/${b.paymentId}/dispute`, { headers: cookie(b.brand.token), data: { reason: "The stories were never posted." } });
const adminPayment = async (request: APIRequestContext, token: string, id: string) => ((await (await request.get(`${API_MAIN}/admin/payments/${id}`, { headers: cookie(token) })).json()) as { data: { payment: Json } }).data.payment;

async function adminSession(browser: Browser, email: string): Promise<{ context: BrowserContext; page: Page; token: string }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, email);
  await page.waitForURL(`${APP}/admin`);
  page.on("dialog", (d) => void d.accept());
  return { context, page, token: await tokenOf(context) };
}

const confirmWith = async (page: Page, note: string) => {
  await page.locator("#decision-text").fill(note);
  await page.getByRole("button", { name: /^Confirm/ }).click();
};

test.describe("finance administration against the real API (simulated provider)", () => {
  test("upholding a dispute needs two different administrators; the payment stays in escrow and nothing is released or returned", async ({ browser, request }) => {
    test.setTimeout(240_000);
    const b = await heldPayment(browser, request);
    expect((await report(request, b)).status()).toBe(200);
    expect((await dispute(request, b)).status()).toBe(201);
    const finance = await adminSession(browser, ACCOUNTS.finance);
    const requests = trackRequests(finance.page);
    const bodies = collectBodies(finance.page);

    await finance.page.goto(`${APP}/admin/payments/${b.paymentId}`);
    await expect(finance.page.getByRole("button", { name: "Release payment" })).toHaveCount(0);
    await finance.page.getByRole("button", { name: "Propose to uphold" }).click();
    await expect(finance.page.locator("#decision-text-help")).toContainText("returns no money");
    await finance.page.getByRole("button", { name: /^Confirm/ }).click(); // no note yet
    await expect(finance.page.getByText(/at least 5 characters/)).toBeVisible();
    expect((await adminPayment(request, finance.token, b.paymentId)).dispute?.outcome ?? null).toBeNull();
    await confirmWith(finance.page, "The stories were never posted; evidence checked.");
    await expect(finance.page.getByRole("status")).toContainText("Another administrator must now confirm");
    await expect.poll(async () => (await adminPayment(request, finance.token, b.paymentId)).dispute?.outcome?.status).toBe("proposed");

    // The proposer cannot decide their own proposal: not in the page, not at the API.
    await finance.page.reload();
    await expect(finance.page.getByText(/You proposed upholding this dispute/)).toBeVisible();
    await expect(finance.page.getByRole("button", { name: "Confirm upholding" })).toHaveCount(0);
    await expect(finance.page.getByRole("button", { name: "Dismiss dispute" })).toHaveCount(0);
    expect((await request.post(`${API_MAIN}/admin/payments/${b.paymentId}/dispute/uphold/confirm`, { headers: cookie(finance.token), data: { note: "I confirm my own proposal" } })).status()).toBe(403);
    expect((await request.post(`${API_MAIN}/admin/payments/${b.paymentId}/dispute/resolve`, { headers: cookie(finance.token), data: { resolution: "dismissed", note: "Dismissing while pending" } })).status()).toBe(409);

    // A second administrator confirms.
    const superAdmin = await adminSession(browser, ACCOUNTS.superAdmin);
    await superAdmin.page.goto(`${APP}/admin/payments/${b.paymentId}`);
    await expect(superAdmin.page.getByRole("button", { name: "Withdraw my proposal" })).toHaveCount(0);
    await superAdmin.page.getByRole("button", { name: "Confirm upholding" }).click();
    await confirmWith(superAdmin.page, "Second review agrees with the evidence.");
    await expect(superAdmin.page.getByRole("status")).toContainText("no money has been returned");
    await expect.poll(async () => (await adminPayment(request, finance.token, b.paymentId)).dispute?.status).toBe("resolved_in_favour");
    const upheld = await adminPayment(request, finance.token, b.paymentId);
    expect(upheld).toMatchObject({ status: "requested", dispute: { awaitingPolicyDecision: true } });
    expect(upheld.actions.canRelease).toBe(false);
    expect((await request.post(`${API_MAIN}/admin/payments/${b.paymentId}/release`, { headers: cookie(finance.token), data: {} })).status()).toBe(409);
    expect((await request.post(`${API_MAIN}/admin/payments/${b.paymentId}/refund`, { headers: { ...cookie(finance.token), "Idempotency-Key": `fin-ref-${b.offerId.slice(0, 16)}` }, data: { amountXaf: 85000, reason: "Trying to refund after delivery" } })).status()).toBe(409);

    // The overview counts it, exactly as the API's own report does.
    await finance.page.goto(`${APP}/admin`);
    const attention = ((await (await request.get(`${API_MAIN}/admin/payments/attention`, { headers: cookie(finance.token) })).json()) as { data: { attention: { upheldDisputesAwaitingPolicy: { count: number }; openDisputes: { count: number } } } }).data.attention;
    expect(attention.upheldDisputesAwaitingPolicy.count).toBeGreaterThan(0);
    await expect(finance.page.getByTestId("queue-disputes.upheld")).toHaveText(String(attention.upheldDisputesAwaitingPolicy.count));
    await expect(finance.page.getByTestId("queue-disputes.open")).toHaveText(String(attention.openDisputes.count));

    expect(requests.filter((u) => u.includes(":4100") || u.includes("/api/v1/"))).toEqual([]);
    for (const response of bodies) expect(response.text, response.url).not.toContain(finance.token);
    await finance.context.close();
    await superAdmin.context.close();
    await b.brand.context.close();
  });

  test("dismissing a dispute makes the payment releasable and Finance releases it to the SIMULATED balance", async ({ browser, request }) => {
    test.setTimeout(240_000);
    const b = await heldPayment(browser, request);
    expect((await report(request, b)).status()).toBe(200);
    expect((await dispute(request, b)).status()).toBe(201);
    const finance = await adminSession(browser, ACCOUNTS.finance);
    await finance.page.goto(`${APP}/admin/payments/${b.paymentId}`);
    await finance.page.getByRole("button", { name: "Dismiss dispute" }).click();
    await confirmWith(finance.page, "The stories were posted; the dispute has no basis.");
    await expect(finance.page.getByRole("status")).toContainText("The dispute was dismissed");
    await expect.poll(async () => (await adminPayment(request, finance.token, b.paymentId)).dispute?.status).toBe("resolved_against");
    await finance.page.reload();
    await finance.page.getByRole("button", { name: "Release payment" }).click();
    await finance.page.getByRole("button", { name: /^Confirm: Release payment/ }).click();
    await expect(finance.page.getByRole("status")).toContainText("The payment was released");
    expect((await adminPayment(request, finance.token, b.paymentId)).status).toBe("released");
    const wallet = ((await (await request.get(`${API_MAIN}/creator/wallet`, { headers: cookie(b.creatorToken) })).json()) as { data: { wallet: { availableXaf: number; simulated: { balanceXaf: number; withdrawable: boolean } } } }).data.wallet;
    expect(wallet).toMatchObject({ availableXaf: 0, simulated: { balanceXaf: 68000, withdrawable: false } });
    await finance.context.close();
    await b.brand.context.close();
  });

  test("Finance records a refund of a held SIMULATED payment: it is bookkeeping, labelled so, and no real money is claimed", async ({ browser, request }) => {
    test.setTimeout(240_000);
    const b = await heldPayment(browser, request);
    const finance = await adminSession(browser, ACCOUNTS.finance);
    await finance.page.goto(`${APP}/admin/payments/${b.paymentId}`);
    await expect(finance.page.getByText(/No provider refund exists/).first()).toBeVisible();
    await finance.page.getByRole("button", { name: "Record full refund" }).click();
    await expect(finance.page.getByText(/simulated: the refund is bookkeeping and no real money moves/i)).toBeVisible();
    await confirmWith(finance.page, "The creator never started the work.");
    await expect(finance.page.getByRole("status")).toContainText("No real money moved");
    await expect.poll(async () => (await adminPayment(request, finance.token, b.paymentId)).status).toBe("refunded");

    const refunds = ((await (await request.get(`${API_MAIN}/admin/refunds?paymentId=${b.paymentId}`, { headers: cookie(finance.token) })).json()) as { data: { id: string; status: string; amountXaf: number; simulated: boolean; realMoneyReturned: boolean }[] }).data;
    expect(refunds).toHaveLength(1);
    expect(refunds[0]).toMatchObject({ status: "completed", amountXaf: 85000, simulated: true, realMoneyReturned: false });

    await finance.page.goto(`${APP}/admin/refunds`);
    const row = finance.page.getByRole("row").filter({ hasText: b.reference });
    await expect(row).toContainText("Simulated");
    await expect(row).toContainText("85,000 FCFA");
    await row.getByRole("link").click();
    await expect(finance.page.getByText(/No real money has been returned/).first()).toBeVisible();
    await expect(finance.page.getByRole("button", { name: "Cancel refund" })).toHaveCount(0);

    // A second refund of the same payment is refused by the API, and the payment page offers nothing.
    await finance.page.goto(`${APP}/admin/payments/${b.paymentId}`);
    await expect(finance.page.getByRole("button", { name: "Record full refund" })).toHaveCount(0);
    const again = await request.post(`${API_MAIN}/admin/payments/${b.paymentId}/refund`, { headers: { ...cookie(finance.token), "Idempotency-Key": `fin-second-${b.offerId.slice(0, 14)}` }, data: { amountXaf: 85000, reason: "A second try at refunding" } });
    expect(again.status()).toBe(409);
    expect(((await (await request.get(`${API_MAIN}/admin/refunds?paymentId=${b.paymentId}`, { headers: cookie(finance.token) })).json()) as { data: unknown[] }).data).toHaveLength(1);
    await finance.context.close();
    await b.brand.context.close();
  });

  test("reconciliation shows readiness and exceptions honestly; an issue whose collection is pending cannot be closed", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const finance = await adminSession(browser, ACCOUNTS.finance);
    await finance.page.goto(`${APP}/admin/reconciliation`);
    await expect(finance.page.getByText("Not ready for real payments:")).toBeVisible();
    await expect(finance.page.getByText(/must not be configured in production/)).toBeVisible();
    await expect(finance.page.getByText("Provider", { exact: true })).toBeVisible();
    await expect(finance.page.getByText(/\(simulation\)/)).toBeVisible();
    const open = ((await (await request.get(`${API_MAIN}/admin/payments/issues?resolved=false&limit=1`, { headers: cookie(finance.token) })).json()) as { data: { id: string; collectionStatus: string | null }[] }).data;
    if (open[0]) {
      await finance.page.goto(`${APP}/admin/reconciliation/${open[0].id}`);
      if (open[0].collectionStatus === "pending") {
        await expect(finance.page.getByText(/still pending at the provider/)).toBeVisible();
        await expect(finance.page.getByRole("button", { name: /Resolve with a note|Dismiss as noise/ })).toHaveCount(0);
        expect((await request.post(`${API_MAIN}/admin/payments/issues/${open[0].id}/resolve`, { headers: cookie(finance.token), data: { note: "Trying to close a pending issue" } })).status()).toBe(409);
      }
    }
    await finance.page.goto(`${APP}/admin/reconciliation/not-a-uuid`);
    await expect(finance.page.getByText(/could not be found|not found|404/i).first()).toBeVisible();
    await finance.context.close();
  });

  test("withdrawals and refund requests are empty without real money, and every finance area is closed to other roles", async ({ browser, request }) => {
    test.setTimeout(180_000);
    const finance = await adminSession(browser, ACCOUNTS.finance);
    await finance.page.goto(`${APP}/admin/withdrawals`);
    await expect(finance.page.getByText(/No payout provider is connected/)).toBeVisible();
    await expect(finance.page.getByText("No withdrawals match.")).toBeVisible();
    await finance.page.goto(`${APP}/admin/refund-requests`);
    await expect(finance.page.getByText(/A request is not a refund/)).toBeVisible();
    await expect(finance.page.getByText("No refund requests match.")).toBeVisible();
    await expect(finance.page.getByRole("link", { name: "Withdrawals" }).first()).toBeVisible();

    const manager = await adminSession(browser, ACCOUNTS.manager);
    await expect(manager.page.getByRole("link", { name: "Withdrawals" })).toHaveCount(0);
    for (const path of ["/admin/refund-requests", "/admin/refunds", "/admin/withdrawals", "/admin/reconciliation"]) {
      await manager.page.goto(`${APP}${path}`);
      await expect(manager.page, path).toHaveURL(`${APP}/admin?denied=permission`);
    }
    for (const path of ["/admin/payments/attention", "/admin/payments/diagnostics", "/admin/payments/readiness", "/admin/withdrawals", "/admin/refunds", "/admin/refund-requests", "/admin/payments/issues"]) {
      expect((await request.get(`${API_MAIN}${path}`, { headers: cookie(manager.token) })).status(), path).toBe(403);
    }
    const brand = await newBrandSession(browser);
    for (const path of ["/admin/withdrawals", "/admin/refunds", "/admin/reconciliation", "/admin/refund-requests"]) {
      await brand.page.goto(`${APP}${path}`);
      await expect(brand.page, path).not.toHaveURL(new RegExp(`${path}$`));
    }
    await finance.context.close();
    await manager.context.close();
    await brand.context.close();
  });
});
