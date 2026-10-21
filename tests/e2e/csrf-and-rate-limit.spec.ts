import { expect, test } from "@playwright/test";
import { ACCOUNTS, APP, APP_RATE, PASSWORD, alertOf, expectSignedOut, sessionCookie } from "./helpers";

test.describe("Server Action origin protection (Next.js built-in)", () => {
  test("a replayed sign-in action from a foreign Origin is refused and sets no cookie; the same call from the real origin is processed", async ({ page, context, request }) => {
    // Capture a real action call made by the sign-in form.
    let captured: { action: string; contentType: string; body: string; url: string } | undefined;
    page.on("request", (req) => {
      const action = req.headers()["next-action"];
      if (action && req.method() === "POST" && !captured) {
        captured = { action, contentType: req.headers()["content-type"] ?? "text/plain;charset=UTF-8", body: req.postData() ?? "", url: req.url() };
      }
    });
    await page.goto(`${APP}/sign-in`);
    await page.getByLabel("Email").fill(ACCOUNTS.brand);
    await page.getByLabel("Password").fill("WrongPassw0rd");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(alertOf(page)).toContainText("Email or password is incorrect");
    expect(captured).toBeDefined();
    const call = captured!;

    const forged = await request.post(call.url, {
      headers: { "next-action": call.action, "content-type": call.contentType, origin: "http://evil.example", host: "127.0.0.1:3100" },
      data: call.body.replace("WrongPassw0rd", PASSWORD),
    });
    expect(forged.status(), "a foreign-origin action call must not succeed").not.toBe(200);
    expect(forged.headers()["set-cookie"] ?? "").not.toContain("ioh_session");
    await expectSignedOut(context);

    const genuine = await request.post(call.url, {
      headers: { "next-action": call.action, "content-type": call.contentType, origin: APP },
      data: call.body,
    });
    expect(genuine.status()).toBe(200); // processed (wrong password -> normal failure result, still no cookie)
    expect(genuine.headers()["set-cookie"] ?? "").not.toContain("ioh_session");
  });
});

test.describe("client address forwarding and login rate limiting through the BFF", () => {
  // App on :3101 trusts ONE proxy hop (TRUSTED_PROXY_HOPS=1) and its API trusts one hop (TRUST_PROXY=1) with 3 login attempts per 15 minutes.
  const attempt = async (browser: import("@playwright/test").Browser, forwardedFor: string) => {
    const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": forwardedFor } });
    const page = await context.newPage();
    await page.goto(`${APP_RATE}/sign-in`);
    await page.getByLabel("Email").fill(ACCOUNTS.brand);
    await page.getByLabel("Password").fill("WrongPassw0rd");
    await page.getByRole("button", { name: "Login" }).click();
    const alert = await alertOf(page).textContent();
    await context.close();
    return alert ?? "";
  };

  test("each client address is limited independently; a forged left-hand entry cannot dodge the limit", async ({ browser }) => {
    const unique = Math.floor(Math.random() * 200) + 10;
    const clientA = `198.51.100.${unique}`;
    const clientB = `198.51.101.${unique}`;

    for (let i = 0; i < 3; i += 1) expect(await attempt(browser, clientA)).toContain("Email or password is incorrect");
    expect(await attempt(browser, clientA)).toMatch(/Too many attempts/);

    // A different client is unaffected: the BFF really forwards the per-client address.
    expect(await attempt(browser, clientB)).toContain("Email or password is incorrect");

    // The attacker prepends a fake address; only the entry the trusted proxy appended (rightmost) counts, so client A stays limited.
    expect(await attempt(browser, `203.0.113.7, ${clientA}`)).toMatch(/Too many attempts/);
  });

  test("a successful sign-in is also subject to the same limiter and never reveals a session to a limited client", async ({ browser }) => {
    const client = `198.51.102.${Math.floor(Math.random() * 200) + 10}`;
    const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": client } });
    const page = await context.newPage();
    for (let i = 0; i < 3; i += 1) {
      await page.goto(`${APP_RATE}/sign-in`);
      await page.getByLabel("Email").fill(ACCOUNTS.brand);
      await page.getByLabel("Password").fill("WrongPassw0rd");
      await page.getByRole("button", { name: "Login" }).click();
      await expect(alertOf(page)).toContainText("Email or password is incorrect");
    }
    await page.goto(`${APP_RATE}/sign-in`);
    await page.getByLabel("Email").fill(ACCOUNTS.brand);
    await page.getByLabel("Password").fill(PASSWORD); // the RIGHT password, but the client is limited
    await page.getByRole("button", { name: "Login" }).click();
    await expect(alertOf(page)).toContainText(/Too many attempts/);
    expect(await sessionCookie(context)).toBeUndefined();
    await context.close();
  });
});
