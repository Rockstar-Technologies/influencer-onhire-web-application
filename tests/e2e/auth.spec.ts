import { expect, test } from "@playwright/test";
import { ACCOUNTS, API_MAIN, APP, PASSWORD, alertOf, collectBodies, expectSignedOut, sessionCookie, signIn, trackRequests, uniqueEmail } from "./helpers";

async function signUp(page: import("@playwright/test").Page, type: "brand" | "creator", email: string) {
  await page.goto(`${APP}/sign-up`);
  if (type === "creator") await page.getByText("I'm a Creator").click();
  await page.getByLabel(/business name|full name/i).fill(type === "brand" ? "E2E Brand" : "E2E Creator");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/mobile number/i).fill(`67${Math.floor(1000000 + Math.random() * 8999999)}`);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /create account/i }).click();
}

test.describe("anonymous visitors", () => {
  for (const path of ["/admin", "/admin/users", "/admin/payments", "/admin/support", "/brand/payments", "/brand/campaign-payments", "/creator/payments", "/creator/earnings", "/creator/requests", "/campaigns/new", "/brand/campaigns", "/influencers/amina.beauty/hire", "/for-creators/apply/profile", "/for-creators/apply/rates"]) {
    test(`${path} redirects to sign-in with a safe next`, async ({ page }) => {
      await page.goto(`${APP}${path}`);
      await expect(page).toHaveURL(new RegExp(`/sign-in\\?next=${encodeURIComponent(path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
      await expect(page.getByLabel("Password")).toBeVisible();
    });
  }

  test("the retired /post-campaign URL leads to sign-in and then to the real campaign form", async ({ page }) => {
    await page.goto(`${APP}/post-campaign`);
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcampaigns%2Fnew/);
  });

  test("the admin CSV export answers 401 and returns no data", async ({ request }) => {
    const response = await request.get(`${APP}/admin/export?range=30d`);
    expect(response.status()).toBe(401);
    expect(await response.text()).not.toContain("Platform revenue");
    expect(response.headers()["cache-control"]).toBe("no-store");
  });

  test("the admin export refuses state-changing methods", async ({ request }) => {
    for (const method of ["post", "put", "patch", "delete"] as const) {
      expect((await request[method](`${APP}/admin/export`)).status()).toBe(405);
    }
  });

  test("public pages stay open and show Login pointing at /sign-in", async ({ page }) => {
    await page.goto(`${APP}/`);
    await expect(page.getByRole("link", { name: "Login" }).first()).toHaveAttribute("href", "/sign-in");
  });
});

test.describe("sign-in, session and sign-out", () => {
  test("wrong password shows an error and sets no cookie", async ({ page, context }) => {
    await signIn(page, ACCOUNTS.brand, "WrongPassw0rd");
    await expect(alertOf(page)).toContainText("Email or password is incorrect");
    await expect(page).toHaveURL(/\/sign-in/);
    await expectSignedOut(context);
  });

  test("a brand signs in, lands on its payments page, survives a reload and signs out", async ({ page, context }) => {
    await signIn(page, ACCOUNTS.brand);
    await expect(page).toHaveURL(`${APP}/brand/payments`);
    const cookie = await sessionCookie(context);
    expect(cookie).toBeDefined();

    await page.reload();
    await expect(page).toHaveURL(`${APP}/brand/payments`);

    await page.getByRole("button", { name: /sign out/i }).first().click();
    await expect(page).toHaveURL(`${APP}/sign-in`);
    await expectSignedOut(context);

    await page.goto(`${APP}/brand/payments`);
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fbrand%2Fpayments/);
  });

  test("the session cookie is HttpOnly, SameSite=Lax, host-only and not readable by page scripts", async ({ page, context }) => {
    await signIn(page, ACCOUNTS.brand);
    await expect(page).toHaveURL(`${APP}/brand/payments`);
    const cookie = (await sessionCookie(context))!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("Lax");
    expect(cookie.path).toBe("/");
    expect(cookie.domain).toBe("127.0.0.1");
    expect(await page.evaluate(() => document.cookie)).not.toContain("ioh_session");
  });

  test("'keep me logged in' makes the cookie persistent, otherwise it is a session cookie", async ({ page, context, browser }) => {
    await page.goto(`${APP}/sign-in`);
    await page.getByLabel("Email").fill(ACCOUNTS.brand);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByLabel(/keep me logged in/i).uncheck();
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page).toHaveURL(`${APP}/brand/payments`);
    expect((await sessionCookie(context))!.expires).toBe(-1);

    const second = await browser.newContext();
    const other = await second.newPage();
    await signIn(other, ACCOUNTS.brand); // the form's default is "remember me" ticked
    await expect(other).toHaveURL(`${APP}/brand/payments`);
    expect((await sessionCookie(second))!.expires).toBeGreaterThan(Date.now() / 1000 + 86_400);
    await second.close();
  });

  test("each role lands on its own home", async ({ browser }) => {
    const homes: Array<[string, RegExp]> = [
      [ACCOUNTS.activeCreator, /\/creator\/requests$/],
      [ACCOUNTS.pendingCreator, /\/for-creators\/apply\/(profile|submitted)$/], // a pending creator lands in the application area; a submitted application redirects on to its status page
      [ACCOUNTS.manager, /\/admin$/],
    ];
    for (const [email, url] of homes) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await signIn(page, email);
      await expect(page).toHaveURL(url);
      await context.close();
    }
  });

  test("a revoked or expired server-side session is treated as signed out", async ({ page, context, request }) => {
    await signIn(page, ACCOUNTS.brand);
    await expect(page).toHaveURL(`${APP}/brand/payments`);
    const token = (await sessionCookie(context))!.value;

    // Revoke the session directly at the API (what expiry or an administrator would do).
    const logout = await request.post(`${API_MAIN}/auth/logout`, { headers: { Cookie: `ioh_session=${token}` } });
    expect(logout.status()).toBe(200);

    await page.goto(`${APP}/brand/payments`);
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fbrand%2Fpayments&expired=1/);
    await expect(page.getByRole("status")).toContainText("Your session has ended");
    // The stale cookie does not grant anything and a fresh sign-in works.
    await signIn(page, ACCOUNTS.brand);
    await expect(page).toHaveURL(`${APP}/brand/payments`);
  });

  test("/login keeps working: it redirects to /sign-in keeping email and a safe next", async ({ page }) => {
    await page.goto(`${APP}/login?email=me%40example.com&next=%2Fbrand%2Fpayments`);
    await expect(page).toHaveURL(`${APP}/sign-in?email=me%40example.com&next=%2Fbrand%2Fpayments`);
    await expect(page.getByLabel("Email")).toHaveValue("me@example.com");
    await page.getByLabel("Email").fill(ACCOUNTS.brand);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page).toHaveURL(`${APP}/brand/payments`);
  });

  test("an unsafe next is ignored after signing in", async ({ page }) => {
    for (const evil of ["https://evil.example/", "//evil.example", "/admin/users"]) {
      await page.goto(`${APP}/sign-in?next=${encodeURIComponent(evil)}`);
      await page.getByLabel("Email").fill(ACCOUNTS.brand);
      await page.getByLabel("Password").fill(PASSWORD);
      await page.getByRole("button", { name: "Login" }).click();
      await expect(page).toHaveURL(`${APP}/brand/payments`);
      await page.getByRole("button", { name: /sign out/i }).first().click();
      await expect(page).toHaveURL(`${APP}/sign-in`);
    }
  });

  test("a signed-in user visiting /sign-in goes straight to their own home", async ({ page }) => {
    await signIn(page, ACCOUNTS.brand);
    await expect(page).toHaveURL(`${APP}/brand/payments`);
    await page.goto(`${APP}/sign-in`);
    await expect(page).toHaveURL(`${APP}/brand/payments`);
  });
});

test.describe("sign-up", () => {
  test("a new brand is signed in and sent to campaign creation", async ({ page, context }) => {
    await signUp(page, "brand", uniqueEmail("brand"));
    await expect(page).toHaveURL(`${APP}/campaigns/new`);
    expect(await sessionCookie(context)).toBeDefined();
    await expect(page.getByRole("button", { name: /sign out/i }).first()).toBeVisible();
  });

  test("a new creator is pending: they reach the application and nothing else", async ({ page, context }) => {
    await signUp(page, "creator", uniqueEmail("creator"));
    await expect(page).toHaveURL(`${APP}/for-creators/apply/profile`);
    expect(await sessionCookie(context)).toBeDefined();
    await expect(page.getByRole("link", { name: /continue application/i }).first()).toBeVisible();

    for (const path of ["/creator/requests", "/creator/earnings", "/creator/payments"]) {
      await page.goto(`${APP}${path}`);
      await expect(page).toHaveURL(`${APP}/for-creators/apply/profile`);
    }
    await page.goto(`${APP}/brand/payments`);
    await expect(page).toHaveURL(/\/sign-in\?denied=brand/);
    await expect(alertOf(page)).toContainText("only for brand accounts");
    await page.goto(`${APP}/admin`);
    await expect(page).toHaveURL(/\/sign-in\?denied=admin/);

    // The application stays open to them; a later step needs the earlier ones, so a fresh draft is sent back to step 1.
    await page.goto(`${APP}/for-creators/apply/audience`);
    await expect(page).toHaveURL(`${APP}/for-creators/apply/profile`);
  });

  test("a taken e-mail offers a sign-in link", async ({ page }) => {
    await signUp(page, "brand", ACCOUNTS.brand);
    await expect(page.getByRole("link", { name: /login instead/i })).toHaveAttribute("href", `/sign-in?email=${encodeURIComponent(ACCOUNTS.brand)}`);
  });

  test("weak passwords and missing terms are caught before anything is sent", async ({ page }) => {
    const requests = trackRequests(page);
    await page.goto(`${APP}/sign-up`);
    await page.getByLabel(/business name|full name/i).fill("E2E Brand");
    await page.getByLabel("Email").fill(uniqueEmail("weak"));
    await page.getByLabel(/mobile number/i).fill("670000123");
    await page.getByLabel("Password").fill("onlyletters");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/mix letters and at least one number/i)).toBeVisible();
    await expect(page.getByText("Please accept the terms to continue.")).toBeVisible();
    expect(requests.filter((url) => url.includes("/api/v1/auth/register"))).toHaveLength(0);
  });
});

test.describe("authorization", () => {
  test("a brand cannot open the admin area or the creator dashboards", async ({ page }) => {
    await signIn(page, ACCOUNTS.brand);
    await expect(page).toHaveURL(`${APP}/brand/payments`);
    for (const [path, area] of [["/admin", "admin"], ["/admin/payments", "admin"], ["/creator/earnings", "creator"]] as const) {
      await page.goto(`${APP}${path}`);
      await expect(page).toHaveURL(new RegExp(`/sign-in\\?denied=${area}`));
      await expect(alertOf(page)).toContainText("You are signed in as");
    }
  });

  test("an active creator cannot open brand pages, admin pages or send a hire request", async ({ page }) => {
    await signIn(page, ACCOUNTS.activeCreator);
    await expect(page).toHaveURL(`${APP}/creator/requests`);
    for (const [path, area] of [["/brand/payments", "brand"], ["/campaigns/new", "brand"], ["/influencers/amina.beauty/hire", "brand"], ["/admin", "admin"]] as const) {
      await page.goto(`${APP}${path}`);
      await expect(page).toHaveURL(new RegExp(`/sign-in\\?denied=${area}`));
    }
  });

  test("administrators are limited to the permissions the API gave them", async ({ page }) => {
    await signIn(page, ACCOUNTS.manager); // no payments.view
    await expect(page).toHaveURL(`${APP}/admin`);
    await page.goto(`${APP}/admin/payments`);
    await expect(page).toHaveURL(`${APP}/admin?denied=permission`);
    await page.goto(`${APP}/admin/users`);
    await expect(page).toHaveURL(`${APP}/admin/users`); // users.view is held
    await page.goto(`${APP}/admin/support`);
    await expect(page).toHaveURL(`${APP}/admin?denied=permission`); // tickets.manage is not
  });

  test("the export requires dashboard.export (and answers 501: nothing real to export)", async ({ browser }) => {
    const manager = await browser.newContext();
    const managerPage = await manager.newPage();
    await signIn(managerPage, ACCOUNTS.manager);
    await expect(managerPage).toHaveURL(`${APP}/admin`);
    const denied = await manager.request.get(`${APP}/admin/export?range=30d`);
    expect(denied.status()).toBe(403);
    expect(await denied.text()).not.toContain("Platform revenue");
    await manager.close();

    const finance = await browser.newContext();
    const financePage = await finance.newPage();
    await signIn(financePage, ACCOUNTS.finance);
    await expect(financePage).toHaveURL(`${APP}/admin`);
    const allowed = await finance.request.get(`${APP}/admin/export?range=30d`);
    // The permission is honoured, but the API has no export source and the app no longer invents sample data: an honest 501.
    expect(allowed.status()).toBe(501);
    expect(allowed.headers()["cache-control"]).toBe("no-store");
    expect(await allowed.json()).toEqual({ error: "export_not_available" });
    await finance.close();
  });

  test("a brand cannot download the export", async ({ page, context }) => {
    await signIn(page, ACCOUNTS.brand);
    await expect(page).toHaveURL(`${APP}/brand/payments`);
    expect((await context.request.get(`${APP}/admin/export`)).status()).toBe(403);
  });

  test("the old demo cookie grants nothing", async ({ context, page }) => {
    await context.addCookies([{ name: "ioh_demo_account", value: "u-101", url: APP }]);
    await page.goto(`${APP}/brand/payments`);
    await expect(page).toHaveURL(/\/sign-in\?next=/);
    await page.goto(`${APP}/admin`);
    await expect(page).toHaveURL(/\/sign-in\?next=/);
  });

  test("a forged session value is rejected", async ({ context, page }) => {
    await context.addCookies([{ name: "ioh_session", value: "A".repeat(43), url: APP, httpOnly: true, sameSite: "Lax" }]);
    await page.goto(`${APP}/brand/payments`);
    await expect(page).toHaveURL(/\/sign-in\?next=/);
  });
});

test.describe("backend-for-frontend boundary", () => {
  test("the browser talks only to the app, never to the API, and never sees the session value", async ({ page, context }) => {
    const requests = trackRequests(page);
    const bodies = collectBodies(page);

    await signIn(page, ACCOUNTS.brand);
    await expect(page).toHaveURL(`${APP}/brand/payments`);
    await page.reload();
    await page.goto(`${APP}/admin`); // denied, which exercises another server round trip
    const token = (await sessionCookie(context))!.value;

    expect(requests.filter((url) => url.includes(":4100") || url.includes("/api/v1/"))).toEqual([]);
    expect(requests.every((url) => url.startsWith(APP) || url.startsWith("data:") || url.startsWith("blob:") || url.includes("fonts"))).toBe(true);

    const html = await page.content();
    expect(html).not.toContain(token);
    expect(bodies.length).toBeGreaterThan(0);
    for (const body of bodies) expect(body.text, body.url).not.toContain(token);

    expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toContain(token);
    expect(await page.evaluate(() => JSON.stringify({ ...sessionStorage }))).not.toContain(token);
    expect(await page.evaluate(() => document.cookie)).toBe("");
  });

  test("the browser cannot call the API directly: it refuses any browser origin", async ({ page }) => {
    await page.goto(`${APP}/sign-in`);
    const status = await page.evaluate(async (apiUrl) => {
      try {
        const response = await fetch(`${apiUrl}/auth/me`, { credentials: "include" });
        return response.status;
      } catch {
        return "blocked";
      }
    }, API_MAIN);
    // With no allowed origins the API either answers 403 origin_not_allowed (server side) or the browser blocks the response (CORS).
    expect(["blocked", 403]).toContain(status);
  });
});
