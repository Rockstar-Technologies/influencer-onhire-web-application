import { expect, test } from "@playwright/test";
import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";
import { ACCOUNTS, API_MAIN, APP, PASSWORD, alertOf, collectBodies, managerToken, signIn, tokenOf, trackRequests, uniqueEmail } from "./helpers";

type ApiCampaign = { id: string; status: string; title: string; budgetXaf: number; minEngagementPct: number | null; cities: string[]; ageRanges: string[]; reviewNote: string | null };

const cookie = (token: string) => ({ Cookie: `ioh_session=${token}`, "Content-Type": "application/json" });

async function campaignsOf(request: APIRequestContext, token: string): Promise<ApiCampaign[]> {
  const response = await request.get(`${API_MAIN}/brand/campaigns?limit=100`, { headers: cookie(token) });
  expect(response.status()).toBe(200);
  return ((await response.json()) as { data: ApiCampaign[] }).data;
}

async function fillRequired(page: Page, title: string) {
  await page.getByLabel(/Campaign Title/).fill(title);
  await page.getByLabel(/Niche/).selectOption({ label: "Beauty" });
  await page.getByLabel(/Maximum budget per creator/).fill("500000");
  await page.getByLabel(/Start Date/).fill("2099-03-01");
  await page.getByLabel(/End Date/).fill("2099-03-31");
  await page.getByLabel(/Expectations/).fill("One story and two TikToks, please.");
}

async function brandSignedIn(page: Page, context: BrowserContext) {
  await signIn(page, ACCOUNTS.brand);
  await page.waitForURL(`${APP}/brand/payments`);
  return tokenOf(context);
}

test.describe("brand campaigns against the real API", () => {
  test("create a draft, reload it, edit it, submit it, and see it in the list with its real status", async ({ page, context, request }) => {
    const requests = trackRequests(page);
    const bodies = collectBodies(page);
    const token = await brandSignedIn(page, context);
    const title = `Glow ${Date.now().toString(36)}`;
    const before = (await campaignsOf(request, token)).length;

    await page.goto(`${APP}/campaigns/new`);
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.getByLabel(/Niche/).locator("option", { hasText: "Sports & Fitness" })).toHaveAttribute("value", "sports-fitness");
    await fillRequired(page, title);
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("status")).toContainText("Draft saved");
    await expect(page).toHaveURL(/\/campaigns\/new\?draft=[0-9a-f-]{36}/);

    // What the API stored: one draft, in XAF, exactly as typed.
    const stored = (await campaignsOf(request, token)).filter((c) => c.title === title);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ status: "draft", budgetXaf: 500000});
    expect((await campaignsOf(request, token)).length).toBe(before + 1);

    // The draft survives a reload and a second save updates it instead of creating another.
    await page.reload();
    await expect(page.getByLabel(/Campaign Title/)).toHaveValue(title);
    await page.getByLabel(/Campaign Title/).fill(`${title} v2`);
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("status")).toContainText("Draft saved");
    expect((await campaignsOf(request, token)).filter((c) => c.title.startsWith(title))).toHaveLength(1);

    // Submitting shows the status only after the API confirmed it.
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page).toHaveURL(/\/brand\/campaigns\/[0-9a-f-]{36}\?submitted=1/);
    await expect(page.getByRole("status")).toContainText("submitted for review");
    await expect(page.getByText("Pending review").first()).toBeVisible();
    const submitted = (await campaignsOf(request, token)).find((c) => c.title === `${title} v2`)!;
    expect(submitted.status).toBe("pending_review");

    await page.goto(`${APP}/brand/campaigns`);
    const row = page.getByRole("row", { name: new RegExp(`${title} v2`) });
    await expect(row).toContainText("Pending review");
    await expect(row).toContainText("500,000");

    // A submitted campaign can no longer be opened as a draft; it goes to its status page.
    await page.goto(`${APP}/campaigns/new?draft=${submitted.id}`);
    await expect(page).toHaveURL(`${APP}/brand/campaigns/${submitted.id}`);

    expect(requests.filter((url) => url.includes(":4100") || url.includes("/api/v1/"))).toEqual([]);
    for (const response of bodies) expect(response.text, response.url).not.toContain(token);

    // Withdrawing is a real transition.
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Withdraw from review" }).click();
    await expect(page.getByText("Cancelled").first()).toBeVisible();
    expect((await campaignsOf(request, token)).find((c) => c.id === submitted.id)!.status).toBe("cancelled");
    await expect(page.getByRole("main").getByRole("button")).toHaveCount(0);
  });

  test("a draft can be deleted, and a rejected campaign shows the reviewer's reason with no actions", async ({ page, context, request }) => {
    const token = await brandSignedIn(page, context);
    const title = `Reject ${Date.now().toString(36)}`;
    await page.goto(`${APP}/campaigns/new`);
    await fillRequired(page, title);
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page).toHaveURL(/\/brand\/campaigns\/[0-9a-f-]{36}/);
    const id = page.url().match(/campaigns\/([0-9a-f-]{36})/)![1]!;

    const admin = await managerToken(request);
    const rejected = await request.post(`${API_MAIN}/admin/campaigns/${id}/reject`, { headers: cookie(admin), data: { reason: "Please narrow the audience." } });
    expect(rejected.status()).toBe(200);
    await page.reload();
    await expect(page.getByText("Rejected").first()).toBeVisible();
    await expect(page.getByRole("note", { name: "Reviewer's note" })).toContainText("Please narrow the audience.");
    await expect(page.getByRole("main").getByRole("button")).toHaveCount(0);

    // A second brand-side draft, then delete it.
    await page.goto(`${APP}/campaigns/new`);
    const draftTitle = `Delete ${Date.now().toString(36)}`;
    await fillRequired(page, draftTitle);
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("status")).toContainText("Draft saved");
    const draft = (await campaignsOf(request, token)).find((c) => c.title === draftTitle)!;
    await page.goto(`${APP}/brand/campaigns/${draft.id}`);
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Delete draft" }).click();
    await expect(page).toHaveURL(`${APP}/brand/campaigns`);
    expect((await campaignsOf(request, token)).some((c) => c.id === draft.id)).toBe(false);
  });

  test("the API's validation errors are shown on the field and nothing is lost", async ({ page, context, request }) => {
    const token = await brandSignedIn(page, context);
    const before = (await campaignsOf(request, token)).length;
    await page.goto(`${APP}/campaigns/new`);
    await fillRequired(page, "Too cheap");
    await page.getByLabel(/Maximum budget per creator/).fill("1000");
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page.getByText(/50,000/).first()).toBeVisible();
    await expect(page).toHaveURL(`${APP}/campaigns/new`);
    await expect(page.getByLabel(/Campaign Title/)).toHaveValue("Too cheap");
    expect((await campaignsOf(request, token)).length).toBe(before);
  });

  test("another brand's campaign is simply not found, and anonymous visitors are sent to sign in", async ({ page, context, request, browser }) => {
    const token = await brandSignedIn(page, context);
    const mine = (await campaignsOf(request, token))[0];
    test.skip(!mine, "needs at least one campaign");

    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await otherPage.goto(`${APP}/sign-up`);
    await otherPage.getByLabel(/business name|full name/i).fill("Other Brand");
    await otherPage.getByLabel("Email").fill(uniqueEmail("brand"));
    await otherPage.getByLabel(/mobile number/i).fill(`67${Math.floor(1000000 + Math.random() * 8999999)}`);
    await otherPage.getByLabel("Password").fill(PASSWORD);
    await otherPage.getByRole("checkbox").check();
    await otherPage.getByRole("button", { name: /create account/i }).click();
    await otherPage.waitForURL((url) => !url.pathname.includes("sign-up"));
    const response = await otherPage.goto(`${APP}/brand/campaigns/${mine!.id}`);
    expect(response!.status()).toBe(404);
    await expect(otherPage.locator("body")).not.toContainText(mine!.title);
    await other.close();

    const anon = await browser.newContext();
    const anonPage = await anon.newPage();
    await anonPage.goto(`${APP}/brand/campaigns`);
    await expect(anonPage).toHaveURL(/\/sign-in\?next=%2Fbrand%2Fcampaigns/);
    await anon.close();
  });

  test("a creator cannot use the brand campaign pages", async ({ page }) => {
    await signIn(page, ACCOUNTS.activeCreator);
    await page.waitForURL((url) => !url.pathname.includes("sign-in"));
    await page.goto(`${APP}/brand/campaigns`);
    await expect(page).not.toHaveURL(`${APP}/brand/campaigns`);
    await page.goto(`${APP}/campaigns/new`);
    await expect(page).not.toHaveURL(`${APP}/campaigns/new`);
  });

  test("an ended session keeps the typed form and offers to sign in again", async ({ page, context }) => {
    await brandSignedIn(page, context);
    await page.goto(`${APP}/campaigns/new`);
    await fillRequired(page, "Session test");
    await context.clearCookies();
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(alertOf(page)).toContainText(/session has ended/i);
    await expect(page.getByRole("link", { name: "Sign in again" })).toBeVisible();
    await expect(page.getByLabel(/Campaign Title/)).toHaveValue("Session test");
  });

  test("a double click on Submit creates exactly one campaign", async ({ page, context, request }) => {
    const token = await brandSignedIn(page, context);
    const title = `Once ${Date.now().toString(36)}`;
    await page.goto(`${APP}/campaigns/new`);
    await fillRequired(page, title);
    await page.getByRole("button", { name: "Submit for review" }).dblclick();
    await expect(page).toHaveURL(/\/brand\/campaigns\/[0-9a-f-]{36}/);
    expect((await campaignsOf(request, token)).filter((c) => c.title === title)).toHaveLength(1);
  });

  test("the old demo URLs now lead to the real flow", async ({ page, context }) => {
    await brandSignedIn(page, context);
    for (const path of ["/post-campaign", "/campaigns/preview", "/campaigns/posted"]) {
      await page.goto(`${APP}${path}`);
      await expect(page).toHaveURL(new RegExp(`${APP}/(campaigns/new|brand/campaigns)`));
    }
  });
});
