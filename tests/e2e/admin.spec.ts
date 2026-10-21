import { expect, test } from "@playwright/test";
import type { APIRequestContext, Browser, BrowserContext, Page } from "@playwright/test";
import { ACCOUNTS, API_MAIN, APP, PASSWORD, alertOf, apiToken, approvedCreator, collectBodies, fillAudience, fillProfile, fillRates, newBrandSession, signIn, signUpCreator, tokenOf, trackRequests } from "./helpers";

const cookie = (token: string) => ({ Cookie: `ioh_session=${token}`, "Content-Type": "application/json" });

async function adminSession(browser: Browser, email: string): Promise<{ context: BrowserContext; page: Page; token: string }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, email);
  await page.waitForURL(`${APP}/admin`);
  return { context, page, token: await tokenOf(context) };
}

/** A creator whose application is submitted and waiting for review (all through the browser, like a real applicant). */
async function submittedApplication(browser: Browser, request: APIRequestContext) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = await signUpCreator(page);
  await fillProfile(page, "Review Me");
  await fillAudience(page);
  await fillRates(page);
  await page.getByRole("button", { name: "Submit My Profile" }).click();
  await page.waitForURL(`${APP}/for-creators/apply/submitted`);
  const token = await tokenOf(context);
  const state = await request.get(`${API_MAIN}/creator/applications/current`, { headers: cookie(token) });
  const id = ((await state.json()) as { data: { application: { id: string } } }).data.application.id;
  return { context, page, email, token, id };
}

test.describe("administration against the real API", () => {
  test("a Campaign Manager approves a creator application; the applicant becomes active and can sign in to the dashboard", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const applicant = await submittedApplication(browser, request);
    const admin = await adminSession(browser, ACCOUNTS.manager);
    const requests = trackRequests(admin.page);
    const bodies = collectBodies(admin.page);

    await admin.page.goto(`${APP}/admin/applications?q=${encodeURIComponent(applicant.email.split("@")[0]!.slice(0, 20))}`);
    await admin.page.getByRole("link", { name: "Review Me" }).first().click();
    await expect(admin.page).toHaveURL(`${APP}/admin/applications/${applicant.id}`);
    await expect(admin.page.getByText(/Instagram @amina.beauty/)).toBeVisible();
    await expect(admin.page.getByText(/MTN MoMo · number ending 456/)).toBeVisible();
    await expect(admin.page.locator("body")).not.toContainText("677123456"); // the payout number is never shown to staff

    // Reject needs a reason: stopped before anything is sent.
    admin.page.on("dialog", (dialog) => void dialog.accept());
    await admin.page.getByRole("button", { name: "Approve" }).click();
    await admin.page.getByLabel(/Internal note/).fill("Looks good");
    await admin.page.getByRole("button", { name: /^Confirm: Approve/ }).click();
    await expect(admin.page.getByRole("status")).toContainText("The application was approved");
    await expect(admin.page.getByText("Approved", { exact: true }).first()).toBeVisible();

    // What the API holds: approved, account active (the old session was revoked, so the applicant signs in again).
    const detail = await request.get(`${API_MAIN}/admin/creator-applications/${applicant.id}`, { headers: cookie(admin.token) });
    expect(((await detail.json()) as { data: { application: { status: string; applicant: { accountStatus: string } } } }).data.application).toMatchObject({ status: "approved", applicant: { accountStatus: "active" } });
    const fresh = await browser.newContext();
    const freshPage = await fresh.newPage();
    await signIn(freshPage, applicant.email);
    await expect(freshPage).toHaveURL(`${APP}/creator/requests`);
    await fresh.close();

    // A second look at the same application offers no decision.
    await admin.page.reload();
    await expect(admin.page.getByRole("button", { name: "Approve" })).toHaveCount(0);
    expect(requests.filter((url) => url.includes(":4100") || url.includes("/api/v1/"))).toEqual([]);
    for (const response of bodies) expect(response.text, response.url).not.toContain(admin.token);
    await admin.context.close();
    await applicant.context.close();
  });

  test("rejecting an application needs a reason, shows it to the applicant, and the applicant can apply again", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const applicant = await submittedApplication(browser, request);
    const admin = await adminSession(browser, ACCOUNTS.manager);
    admin.page.on("dialog", (dialog) => void dialog.accept());
    await admin.page.goto(`${APP}/admin/applications/${applicant.id}`);
    await admin.page.getByRole("button", { name: "Reject" }).click();
    await admin.page.getByLabel(/Reason for the applicant/).fill("no");
    await admin.page.getByRole("button", { name: /^Confirm: Reject/ }).click();
    await expect(admin.page.getByText("Write at least 5 characters.")).toBeVisible();
    expect((await request.get(`${API_MAIN}/admin/creator-applications/${applicant.id}`, { headers: cookie(admin.token) }).then((r) => r.json()) as { data: { application: { status: string } } }).data.application.status).toBe("under_review");
    await admin.page.getByLabel(/Reason for the applicant/).fill("Please add clearer content samples.");
    await admin.page.getByRole("button", { name: /^Confirm: Reject/ }).click();
    await expect(admin.page.getByRole("status")).toContainText("The application was rejected");

    await applicant.page.goto(`${APP}/for-creators/apply/submitted`);
    await expect(alertOf(applicant.page)).toContainText("Please add clearer content samples.");
    await admin.context.close();
    await applicant.context.close();
  });

  test("campaign review: approve opens the campaign; reject shows the brand the reason; the queue and history reflect it", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const brand = await newBrandSession(browser);
    const make = async (title: string) => {
      const created = await request.post(`${API_MAIN}/brand/campaigns`, { headers: cookie(brand.token), data: { title, niche: "beauty", budgetXaf: 200000, startDate: "2075-03-01", endDate: "2075-03-15", deliverables: "Two stories and one reel", minEngagementPct: null, cities: ["douala"], interests: [], ageRanges: [], imageFileIds: [] } });
      const id = ((await created.json()) as { data: { campaign: { id: string } } }).data.campaign.id;
      expect((await request.post(`${API_MAIN}/brand/campaigns/${id}/submit`, { headers: cookie(brand.token), data: {} })).status()).toBe(200);
      return id;
    };
    const tag = Date.now().toString(36);
    const approveId = await make(`Approve ${tag}`);
    const rejectId = await make(`Reject ${tag}`);
    const admin = await adminSession(browser, ACCOUNTS.manager);
    admin.page.on("dialog", (dialog) => void dialog.accept());

    await admin.page.goto(`${APP}/admin/campaigns?q=${tag}`);
    await expect(admin.page.getByRole("link", { name: `Approve ${tag}` })).toBeVisible();
    await admin.page.goto(`${APP}/admin/campaigns/${approveId}`);
    await admin.page.getByRole("button", { name: "Approve and open" }).click();
    await admin.page.getByRole("button", { name: /^Confirm: Approve and open/ }).click();
    await expect(admin.page.getByRole("status")).toContainText("approved and is open");
    expect((await request.get(`${API_MAIN}/brand/campaigns/${approveId}`, { headers: cookie(brand.token) }).then((r) => r.json()) as { data: { campaign: { status: string } } }).data.campaign.status).toBe("open");

    await admin.page.goto(`${APP}/admin/campaigns/${rejectId}`);
    await admin.page.getByRole("button", { name: "Reject" }).click();
    await admin.page.getByLabel(/Reason for the brand/).fill("The brief is too vague.");
    await admin.page.getByRole("button", { name: /^Confirm: Reject/ }).click();
    await expect(admin.page.getByRole("status")).toContainText("The campaign was rejected");

    // The brand sees the reviewer's note on its own campaign page.
    await brand.page.goto(`${APP}/brand/campaigns/${rejectId}`);
    await expect(brand.page.getByRole("note", { name: "Reviewer's note" })).toContainText("The brief is too vague.");
    // The queue no longer lists them; history does.
    await admin.page.goto(`${APP}/admin/campaigns?q=${tag}`);
    await expect(admin.page.getByText("No campaigns are waiting for review.")).toBeVisible();
    await admin.page.goto(`${APP}/admin/campaigns?status=rejected&q=${tag}`);
    await expect(admin.page.getByRole("link", { name: `Reject ${tag}` })).toBeVisible();
    await admin.context.close();
    await brand.context.close();
  });

  test("user moderation: suspend ends the person's sessions; reactivate restores access; both notify them in the app", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const target = await newBrandSession(browser);
    const me = await request.get(`${API_MAIN}/auth/me`, { headers: cookie(target.token) });
    const targetId = ((await me.json()) as { data: { user: { id: string } } }).data.user.id;
    const admin = await adminSession(browser, ACCOUNTS.manager);
    admin.page.on("dialog", (dialog) => void dialog.accept());

    await admin.page.goto(`${APP}/admin/users?q=${encodeURIComponent(target.email.split("@")[0]!.slice(0, 18))}`);
    await admin.page.getByRole("link", { name: "Fresh Brand" }).first().click();
    await expect(admin.page).toHaveURL(`${APP}/admin/users/${targetId}`);
    await admin.page.getByRole("button", { name: "Suspend account" }).click();
    await admin.page.getByLabel(/Reason/).fill("Repeated complaints");
    await admin.page.getByRole("button", { name: /^Confirm: Suspend account/ }).click();
    await expect(admin.page.getByRole("status")).toContainText("The account was suspended");
    await expect(admin.page.getByRole("button", { name: "Reactivate account" })).toBeVisible();

    // The suspended brand's session is gone, and it cannot sign in.
    expect((await request.get(`${API_MAIN}/auth/me`, { headers: cookie(target.token) })).status()).toBeGreaterThanOrEqual(401);
    const blocked = await browser.newContext();
    const blockedPage = await blocked.newPage();
    await signIn(blockedPage, target.email);
    await expect(blockedPage).toHaveURL(/\/sign-in/);
    await blocked.close();

    await admin.page.getByRole("button", { name: "Reactivate account" }).click();
    await admin.page.getByRole("button", { name: /^Confirm: Reactivate account/ }).click();
    await expect(admin.page.getByRole("status")).toContainText("The account was reactivated");
    const back = await browser.newContext();
    const backPage = await back.newPage();
    await signIn(backPage, target.email);
    await expect(backPage).toHaveURL(`${APP}/brand/payments`);
    const notifications = await request.get(`${API_MAIN}/notifications?limit=20`, { headers: cookie(await apiToken(request, target.email)) });
    const types = ((await notifications.json()) as { data: { type: string; body: string }[] }).data;
    expect(types.map((n) => n.type)).toEqual(expect.arrayContaining(["account_suspended", "account_reactivated"]));
    expect(JSON.stringify(types)).not.toContain("Repeated complaints"); // the reason stays in the audit trail
    await back.close();
    await admin.context.close();
    await target.context.close();
  });

  test("an administrator cannot moderate their own account; a Campaign Manager cannot touch another administrator", async ({ browser, request }) => {
    test.setTimeout(90_000);
    const admin = await adminSession(browser, ACCOUNTS.manager);
    const list = await request.get(`${API_MAIN}/admin/users?role=admin&limit=50`, { headers: cookie(admin.token) });
    const admins = ((await list.json()) as { data: { id: string; email: string; fullName: string }[] }).data;
    const self = admins.find((a) => a.email === ACCOUNTS.manager)!;
    const other = admins.find((a) => a.email === ACCOUNTS.finance)!;
    await admin.page.goto(`${APP}/admin/users/${self.id}`);
    await expect(admin.page.getByRole("heading", { level: 1 })).toContainText(self.fullName);
    await expect(admin.page.getByRole("button", { name: /Suspend|Reactivate|Reject/ })).toHaveCount(0);
    await admin.page.goto(`${APP}/admin/users/${other.id}`);
    await expect(admin.page.getByRole("button", { name: /Suspend|Reactivate|Reject/ })).toHaveCount(0);
    // Straight at the API: refused.
    expect((await request.post(`${API_MAIN}/admin/users/${self.id}/suspend`, { headers: cookie(admin.token), data: {} })).status()).toBe(403);
    expect((await request.post(`${API_MAIN}/admin/users/${other.id}/suspend`, { headers: cookie(admin.token), data: {} })).status()).toBe(403);
    await admin.context.close();
  });
});

test.describe("payments operations", () => {
  async function requestedPayment(browser: Browser, request: APIRequestContext) {
    const creator = await approvedCreator(browser, request);
    const brand = await newBrandSession(browser);
    const hire = await request.post(`${API_MAIN}/brand/offers`, { headers: cookie(brand.token), data: { creator: creator.username, platform: "instagram", duration: "1-month", paymentMethod: "mtn_momo", contactName: "Jane Brand", location: "Douala" } });
    const offerId = ((await hire.json()) as { data: { offer: { id: string } } }).data.offer.id;
    const creatorToken = await apiToken(request, creator.email);
    expect((await request.post(`${API_MAIN}/creator/offers/${offerId}/accept`, { headers: cookie(creatorToken), data: {} })).status()).toBe(200);
    const funded = await request.post(`${API_MAIN}/brand/offers/${offerId}/fund`, { headers: { ...cookie(brand.token), "Idempotency-Key": `adm-${offerId.slice(0, 20)}` }, data: { paymentMethod: "mtn_momo", payerPhone: "677123456" } });
    expect(funded.status()).toBe(201);
    const paymentId = ((await funded.json()) as { data: { funding: { payment: { id: string; reference: string } } } }).data.funding.payment;
    return { creator, creatorToken, brand, offerId, paymentId: paymentId.id, reference: paymentId.reference };
  }

  test("Finance releases a payment once the brand acknowledged delivery: the creator's SIMULATED wallet is credited with the frozen net", async ({ browser, request }) => {
    test.setTimeout(180_000);
    const booking = await requestedPayment(browser, request);
    const finance = await adminSession(browser, ACCOUNTS.finance);
    finance.page.on("dialog", (dialog) => void dialog.accept());

    // Held: nothing to release yet, and the page says why.
    await finance.page.goto(`${APP}/admin/payments/${booking.paymentId}`);
    await expect(finance.page.getByText("Platform fee (20%)")).toBeVisible();
    await expect(finance.page.getByText("17,000 FCFA").first()).toBeVisible();
    await expect(finance.page.getByText("68,000 FCFA").first()).toBeVisible();
    await expect(finance.page.getByText(/Simulated payment: a development test/)).toBeVisible();
    await expect(finance.page.getByRole("button", { name: "Release payment" })).toHaveCount(0);
    await expect(finance.page.getByText("The creator has not reported the delivery yet.")).toBeVisible();

    // The creator reports delivery; the brand has not acknowledged and the dispute window is open: still not releasable.
    expect((await request.post(`${API_MAIN}/creator/payments/${booking.paymentId}/delivery-report`, { headers: cookie(booking.creatorToken), data: { summary: "Posted the reel and three stories as agreed.", links: ["https://example.com/post/1"] } })).status()).toBe(200);
    await finance.page.reload();
    await expect(finance.page.getByRole("button", { name: "Release payment" })).toHaveCount(0);
    await expect(finance.page.getByText(/the brand can still dispute the delivery/i)).toBeVisible();
    const early = await request.post(`${API_MAIN}/admin/payments/${booking.paymentId}/release`, { headers: cookie(finance.token), data: {} });
    expect(early.status()).toBe(409);

    // The brand acknowledges; now Finance may release.
    expect((await request.post(`${API_MAIN}/brand/payments/${booking.paymentId}/acknowledge-delivery`, { headers: cookie(booking.brand.token), data: {} })).status()).toBe(200);
    await finance.page.goto(`${APP}/admin/payments?releasable=true&invoice=${booking.reference}`);
    await expect(finance.page.getByRole("row").filter({ hasText: booking.reference })).toContainText("Ready to release");
    await finance.page.goto(`${APP}/admin/payments/${booking.paymentId}`);
    await finance.page.getByRole("button", { name: "Release payment" }).click();
    await finance.page.getByRole("button", { name: /^Confirm: Release payment/ }).click();
    await expect(finance.page.getByRole("status")).toContainText("The payment was released");
    await expect(finance.page.getByText("Released", { exact: true }).first()).toBeVisible();
    await expect(finance.page.getByRole("button", { name: "Release payment" })).toHaveCount(0);

    // The wallet holds exactly the frozen net; a second release is refused by the API.
    const wallet = await request.get(`${API_MAIN}/creator/wallet`, { headers: cookie(booking.creatorToken) });
    // Simulated money is credited to the SIMULATED balance only: it never counts as available and can never be withdrawn.
    expect(((await wallet.json()) as { data: { wallet: Record<string, unknown> } }).data.wallet).toMatchObject({ availableXaf: 0, includesSimulatedFunds: true, simulated: { balanceXaf: 68000, withdrawable: false } });
    expect((await request.post(`${API_MAIN}/admin/payments/${booking.paymentId}/release`, { headers: cookie(finance.token), data: {} })).status()).toBe(409);
    await finance.context.close();
    await booking.brand.context.close();
  });

  test("the list filters by status and invoice; a Campaign Manager has no payments access at all", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const booking = await requestedPayment(browser, request);
    const finance = await adminSession(browser, ACCOUNTS.finance);
    await finance.page.goto(`${APP}/admin/payments?status=held&invoice=${booking.reference}`);
    const rows = finance.page.getByRole("row").filter({ hasText: booking.reference });
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText("85,000 FCFA");
    await expect(rows).toContainText("17,000 FCFA / 68,000 FCFA");
    await expect(rows).toContainText("Simulated");
    await finance.page.goto(`${APP}/admin/payments?status=released&invoice=${booking.reference}`);
    await expect(finance.page.getByText("No payments match.")).toBeVisible();
    await finance.page.goto(`${APP}/admin/payments?status=bogus;drop&invoice=1;select`); // unknown values are dropped, never forwarded
    await expect(finance.page.getByRole("heading", { level: 1 })).toHaveText("Payments");

    const manager = await adminSession(browser, ACCOUNTS.manager);
    await manager.page.goto(`${APP}/admin/payments`);
    await expect(manager.page).toHaveURL(`${APP}/admin?denied=permission`);
    await manager.page.goto(`${APP}/admin/payments/${booking.paymentId}`);
    await expect(manager.page).toHaveURL(`${APP}/admin?denied=permission`);
    expect((await request.post(`${API_MAIN}/admin/payments/${booking.paymentId}/release`, { headers: cookie(manager.token), data: {} })).status()).toBe(403);
    await finance.context.close();
    await manager.context.close();
    await booking.brand.context.close();
  });
});

test.describe("who sees what, and what an ended session does", () => {
  test("the menu and overview show only what each administrator's permissions allow", async ({ browser }) => {
    const manager = await adminSession(browser, ACCOUNTS.manager);
    const nav = manager.page.getByRole("navigation", { name: "Admin modules" }).first();
    await expect(nav.getByRole("link", { name: "Applications" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Campaigns" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Users" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Payments" })).toHaveCount(0);
    await expect(manager.page.getByTestId("queue-applications.review")).toBeVisible();
    await expect(manager.page.getByTestId("queue-payments.release")).toHaveCount(0);
    await expect(manager.page.locator("body")).not.toContainText(/revenue|commission/i);
    await manager.context.close();

    const finance = await adminSession(browser, ACCOUNTS.finance);
    const financeNav = finance.page.getByRole("navigation", { name: "Admin modules" }).first();
    await expect(financeNav.getByRole("link", { name: "Payments" })).toBeVisible();
    await expect(financeNav.getByRole("link", { name: "Users" })).toHaveCount(0);
    await expect(finance.page.getByTestId("queue-payments.release")).toBeVisible();
    await finance.page.goto(`${APP}/admin/users`);
    await expect(finance.page).toHaveURL(`${APP}/admin?denied=permission`);
    await finance.context.close();

    const superAdmin = await adminSession(browser, ACCOUNTS.superAdmin);
    for (const name of ["Users", "Applications", "Campaigns", "Payments"]) await expect(superAdmin.page.getByRole("navigation", { name: "Admin modules" }).first().getByRole("link", { name })).toBeVisible();
    await superAdmin.context.close();
  });

  test("brands, creators and anonymous visitors cannot open or use the admin areas", async ({ browser, page, request }) => {
    for (const path of ["/admin/applications", "/admin/campaigns", "/admin/payments", "/admin/users"]) {
      await page.goto(`${APP}${path}`);
      await expect(page).toHaveURL(new RegExp(`/sign-in\\?next=${encodeURIComponent(path).replace(/\./g, "\\.")}`));
    }
    const brand = await newBrandSession(browser);
    for (const path of ["/admin/applications", "/admin/campaigns/00000000-0000-4000-8000-000000000000", "/admin/payments", "/admin/users"]) {
      await brand.page.goto(`${APP}${path}`);
      await expect(brand.page).toHaveURL(/denied=admin/);
    }
    for (const path of ["/admin/users", "/admin/creator-applications", "/admin/campaigns", "/admin/payments"]) {
      expect((await request.get(`${API_MAIN}${path}`, { headers: cookie(brand.token) })).status(), path).toBe(403);
    }
    await brand.context.close();
  });

  test("odd identifiers are 'not found' without reaching the API", async ({ browser }) => {
    const admin = await adminSession(browser, ACCOUNTS.superAdmin);
    for (const route of ["users", "applications", "campaigns", "payments"]) {
      const response = await admin.page.goto(`${APP}/admin/${route}/${encodeURIComponent("../../etc")}`);
      expect(response!.status(), route).toBe(404);
      const unknown = await admin.page.goto(`${APP}/admin/${route}/00000000-0000-4000-8000-000000000000`);
      expect(unknown!.status(), route).toBe(404);
    }
    await admin.context.close();
  });

  test("an ended session on an admin decision keeps the page, says nothing was changed and offers sign-in", async ({ browser, request }) => {
    test.setTimeout(120_000);
    const applicant = await submittedApplication(browser, request);
    const admin = await adminSession(browser, ACCOUNTS.manager);
    admin.page.on("dialog", (dialog) => void dialog.accept());
    await admin.page.goto(`${APP}/admin/applications/${applicant.id}`);
    await admin.page.getByRole("button", { name: "Approve" }).click();
    await admin.context.clearCookies();
    await admin.page.getByRole("button", { name: /^Confirm: Approve/ }).click();
    await expect(alertOf(admin.page)).toContainText(/session has ended/i);
    await expect(admin.page.getByRole("link", { name: "Sign in again" })).toBeVisible();
    const checker = await apiToken(request, ACCOUNTS.manager);
    expect((await request.get(`${API_MAIN}/admin/creator-applications/${applicant.id}`, { headers: cookie(checker) }).then((r) => r.json()) as { data: { application: { status: string } } }).data.application.status).toBe("under_review");
    await admin.context.close();
    await applicant.context.close();
    expect(PASSWORD).toBeTruthy();
  });

  test("a double click on Approve decides the application exactly once", async ({ browser, request }) => {
    test.setTimeout(120_000);
    const applicant = await submittedApplication(browser, request);
    const admin = await adminSession(browser, ACCOUNTS.manager);
    admin.page.on("dialog", (dialog) => void dialog.accept());
    await admin.page.goto(`${APP}/admin/applications/${applicant.id}`);
    await admin.page.getByRole("button", { name: "Approve" }).click();
    await admin.page.getByRole("button", { name: /^Confirm: Approve/ }).dblclick();
    await expect(admin.page.getByRole("status")).toContainText("The application was approved");
    const notifications = await request.get(`${API_MAIN}/notifications?limit=20`, { headers: cookie(await apiToken(request, applicant.email)) });
    const approved = ((await notifications.json()) as { data: { type: string }[] }).data.filter((n) => n.type === "account_approved");
    expect(approved).toHaveLength(1);
    await admin.context.close();
    await applicant.context.close();
  });
});
