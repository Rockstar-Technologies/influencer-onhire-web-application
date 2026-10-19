import { expect } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";

export const APP = "http://127.0.0.1:3100";
export const APP_RATE = "http://127.0.0.1:3101";
export const API_MAIN = process.env.E2E_API_URL ?? "http://127.0.0.1:4100/api/v1";
export const PASSWORD = "Passw0rdtest";

/** Accounts created by the e2e seed (see README). All use PASSWORD. */
export const ACCOUNTS = {
  brand: "acme.brand@ioh.test",
  activeCreator: "kevin.creator@ioh.test",
  pendingCreator: "pending.creator@ioh.test",
  superAdmin: "super.admin@ioh.test",
  manager: "manager@ioh.test", // applications/campaigns/users; NO payments.view, NO dashboard.export
  finance: "finance@ioh.test", // payments.view, payments.release, dashboard.export
} as const;

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}@e2e.test`;
}

export async function signIn(page: Page, email: string, password = PASSWORD, base = APP) {
  await page.goto(`${base}/sign-in`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
}

export async function sessionCookie(context: BrowserContext) {
  const cookies = await context.cookies();
  return cookies.find((cookie) => cookie.name === "ioh_session");
}

export async function expectSignedOut(context: BrowserContext) {
  expect(await sessionCookie(context)).toBeUndefined();
}

/** Records every request the browser makes, so tests can prove it never talks to the API directly. */
export function trackRequests(page: Page) {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  return urls;
}

/** Collects text bodies of everything the browser receives (HTML, JS, JSON, RSC payloads) to search for leaked secrets. */
export function collectBodies(page: Page) {
  const bodies: { url: string; text: string }[] = [];
  page.on("response", async (response) => {
    try {
      const type = response.headers()["content-type"] ?? "";
      if (/text|json|javascript|x-component/i.test(type)) bodies.push({ url: response.url(), text: await response.text() });
    } catch {
      // body unavailable (redirect, aborted): nothing to scan
    }
  });
  return bodies;
}

/** The page's own alert region (Next.js adds an always-present, empty route announcer with the same role). */
export const alertOf = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');
