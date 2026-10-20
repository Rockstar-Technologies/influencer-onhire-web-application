import { expect, test } from "@playwright/test";
import { ACCOUNTS, API_MAIN, APP, signIn, tokenOf } from "./helpers";

const cookie = (token: string) => ({ Cookie: `ioh_session=${token}`, "Content-Type": "application/json" });

test.describe("areas the platform cannot serve yet say so (no sample data, no fake success)", () => {
  test("support tickets: an honest unavailable state for the role that may open it, closed to Finance and the Campaign Manager, and the API has no support, upload, alert, moderation or team route", async ({ browser, request }) => {
    test.setTimeout(120_000);
    const superAdmin = await browser.newContext();
    const page = await superAdmin.newPage();
    await signIn(page, ACCOUNTS.superAdmin);
    await page.waitForURL(`${APP}/admin`);
    await page.goto(`${APP}/admin/support`);
    await expect(page.getByRole("heading", { name: "Support tickets are not available yet" })).toBeVisible();
    await expect(page.getByText(/Nothing on this page is sample data/)).toBeVisible();
    await expect(page.locator("main table, main form")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(/Open Tickets|Sample data:|Search tickets/);

    // The API has no support, upload, alert, moderation or team routes at all.
    const token = await tokenOf(superAdmin);
    for (const [method, path] of [["get", "/admin/tickets"], ["get", "/admin/support/tickets"], ["post", "/uploads"], ["post", "/files"], ["get", "/admin/security-alerts"], ["get", "/admin/alerts"], ["get", "/admin/moderation"], ["get", "/admin/team"], ["post", "/admin/invitations"]] as const) {
      const response = await request[method](`${API_MAIN}${path}`, { headers: cookie(token), ...(method === "post" ? { data: {} } : {}) });
      expect(response.status(), `${method} ${path}`).toBe(404);
    }

    for (const email of [ACCOUNTS.finance, ACCOUNTS.manager]) {
      const context = await browser.newContext();
      const other = await context.newPage();
      await signIn(other, email);
      await other.waitForURL(`${APP}/admin`);
      await other.goto(`${APP}/admin/support`);
      await expect(other, email).toHaveURL(`${APP}/admin?denied=permission`);
      await context.close();
    }
    await superAdmin.close();
  });
});
