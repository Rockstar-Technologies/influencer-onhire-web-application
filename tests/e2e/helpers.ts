import { expect, request as pwRequest } from "@playwright/test";
import type { Browser, BrowserContext, Page } from "@playwright/test";

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

// ---- creator application wizard -------------------------------------------------------------------------------------------------------
import type { APIRequestContext } from "@playwright/test";
import { applicationStateSchema } from "../../src/lib/api/schemas";
import type { ApplicationState } from "../../src/lib/api/schemas";

export const BIO = "I make short beauty reels for audiences in Douala and Yaoundé, and brands love the honest reviews.";

export async function signUpCreator(page: Page, email = uniqueEmail("creator")) {
  await page.goto(`${APP}/sign-up`);
  await page.getByText("I'm a Creator").click();
  await page.getByLabel(/full name/i).fill("E2E Creator");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/mobile number/i).fill(`67${Math.floor(1000000 + Math.random() * 8999999)}`);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL(`${APP}/for-creators/apply/profile`);
  return email;
}

export async function fillProfile(page: Page, name = "Amina Beauty") {
  await page.getByLabel("Creator name").fill(name);
  await page.getByLabel("Niche").selectOption({ label: "Beauty" });
  await page.getByLabel("City").selectOption({ label: "Douala" });
  await page.getByLabel("About you").fill(BIO);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(`${APP}/for-creators/apply/audience`);
}

export async function fillAudience(page: Page) {
  await page.getByRole("checkbox", { name: /Instagram/ }).check();
  await page.getByLabel("Instagram handle").fill("@amina.beauty");
  await page.getByLabel("Instagram followers").fill("25,000");
  await page.getByRole("button", { name: /\+ Add a collaboration/ }).click();
  await page.getByLabel("Brand").fill("MTN Cameroon");
  await page.getByLabel("What you did").fill("Brand ambassador");
  await page.getByLabel("Year").fill("2024");
  await page.getByRole("button", { name: /Beauty & Skincare/ }).click();
  await page.getByRole("button", { name: /Fashion & Apparel/ }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(`${APP}/for-creators/apply/rates`);
}

export async function fillRates(page: Page, number = "677123456") {
  await page.getByLabel(/Instagram/).first().fill("85,000");
  await page.getByLabel("MTN MoMo number").fill(number);
  await page.getByRole("checkbox", { name: /my details are accurate/i }).check();
}

/** The signed-in browser's own session token (the BFF cookie value is the API session), for checking server-side state directly. */
export async function tokenOf(context: BrowserContext): Promise<string> {
  return (await sessionCookie(context))!.value;
}

/** The creator's application exactly as the API holds it, parsed with the same schema the app uses. */
export async function applicationOf(request: APIRequestContext, token: string): Promise<ApplicationState> {
  const response = await request.get(`${API_MAIN}/creator/applications/current`, { headers: { Cookie: `ioh_session=${token}` } });
  expect(response.status()).toBe(200);
  return applicationStateSchema.parse(((await response.json()) as { data: unknown }).data);
}

export async function applicationCount(request: APIRequestContext, token: string): Promise<number> {
  const response = await request.get(`${API_MAIN}/creator/applications`, { headers: { Cookie: `ioh_session=${token}` } });
  return ((await response.json()) as { data: unknown[] }).data.length;
}

export async function apiSend(request: APIRequestContext, token: string, method: "put" | "post", path: string, data: unknown) {
  const response = await request[method](`${API_MAIN}${path}`, { headers: { Cookie: `ioh_session=${token}`, "Content-Type": "application/json" }, data });
  return { status: response.status() };
}

/** An administrator session on the API (not through the app), to approve or reject an application. */
export async function managerToken(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${API_MAIN}/auth/login`, { data: { email: ACCOUNTS.manager, password: PASSWORD } });
  const header = response.headersArray().find((h) => h.name.toLowerCase() === "set-cookie" && h.value.startsWith("ioh_session="))!;
  return header.value.split(";")[0]!.split("=")[1]!;
}

// ---- offers: approved creators and campaigns created through the real API ---------------------------------------------------------------


export interface ApprovedCreator {
  email: string;
  username: string;
}

/**
 * Signs a brand-new creator up, completes the application in the browser, has the campaign manager approve it, and returns the creator's
 * email and public username. Every test gets its own creator, so nothing depends on data left by another test.
 */
export async function approvedCreator(browser: Browser, request: APIRequestContext): Promise<ApprovedCreator> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = await signUpCreator(page);
  await fillProfile(page);
  await fillAudience(page);
  await fillRates(page);
  await page.getByRole("button", { name: "Submit My Profile" }).click();
  await page.waitForURL(`${APP}/for-creators/apply/submitted`);
  const id = (await applicationOf(request, await tokenOf(context))).application.id;
  expect((await apiSend(request, await managerToken(request), "post", `/admin/creator-applications/${id}/approve`, {})).status).toBe(200);
  await context.close();

  const fresh = await browser.newContext();
  const login = await fresh.request.post(`${API_MAIN}/auth/login`, { data: { email, password: PASSWORD } });
  const header = login.headersArray().find((h) => h.name.toLowerCase() === "set-cookie" && h.value.startsWith("ioh_session="))!;
  const token = header.value.split(";")[0]!.split("=")[1]!;
  const profile = await request.get(`${API_MAIN}/creator/profile`, { headers: { Cookie: `ioh_session=${token}` } });
  const username = ((await profile.json()) as { data: { profile: { username: string } } }).data.profile.username;
  await fresh.close();
  return { email, username };
}

/**
 * A session token obtained straight from the API (not through the app), for checking server-side state. It logs in with a throw-away client:
 * a shared client would keep the cookie and send two different session cookies once a second account logs in through it.
 */
export async function apiToken(_request: APIRequestContext, email: string): Promise<string> {
  const client = await pwRequest.newContext();
  try {
    const response = await client.post(`${API_MAIN}/auth/login`, { data: { email, password: PASSWORD } });
    const header = response.headersArray().find((h) => h.name.toLowerCase() === "set-cookie" && h.value.startsWith("ioh_session="))!;
    return header.value.split(";")[0]!.split("=")[1]!;
  } finally {
    await client.dispose();
  }
}

/** Signs a brand-new brand up in a new browser context (signed in on return), so counts such as unread notifications start from zero. */
export async function newBrandSession(browser: Browser): Promise<{ context: BrowserContext; page: Page; token: string; email: string }> {
  const email = uniqueEmail("brand");
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${APP}/sign-up`);
  await page.getByLabel(/business name|full name/i).fill("Fresh Brand");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/mobile number/i).fill(`67${Math.floor(1000000 + Math.random() * 8999999)}`);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("sign-up"));
  return { context, page, token: await tokenOf(context), email };
}
