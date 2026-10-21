import { expect, test } from "@playwright/test";
import {
  ACCOUNTS,
  APP,
  BIO,
  alertOf,
  applicationCount,
  applicationOf,
  apiSend,
  collectBodies,
  fillAudience,
  fillProfile,
  fillRates,
  managerToken,
  sessionCookie,
  signIn,
  signUpCreator,
  tokenOf,
  trackRequests,
} from "./helpers";

const STEP = (name: string) => `${APP}/for-creators/apply/${name}`;

test.describe("creator application wizard against the real API", () => {
  test("a creator completes the whole application and the server holds exactly what was entered", async ({ page, context, request }) => {
    const requests = trackRequests(page);
    const bodies = collectBodies(page);
    await signUpCreator(page);

    await expect(page.locator('input[type="file"]')).toHaveCount(0); // no photo upload exists
    await expect(page.getByText(/Photo upload isn.t available yet/)).toBeVisible();
    await expect(page.getByLabel("Niche").locator("option", { hasText: "Sports & Fitness" })).toHaveAttribute("value", "sports-fitness");

    await fillProfile(page);
    await expect(page).toHaveURL(STEP("audience"));
    await fillAudience(page);
    await expect(page).toHaveURL(STEP("rates"));
    await expect(page.getByLabel("Payment terms")).toHaveValue("full_in_escrow");
    await fillRates(page);
    await page.getByRole("button", { name: "Submit My Profile" }).click();

    await expect(page).toHaveURL(STEP("submitted"));
    await expect(page.getByRole("status")).toContainText("Profile submitted");
    await expect(page.getByText("Under review")).toBeVisible();
    await expect(page.getByText("Beauty · Douala")).toBeVisible();
    await expect(page.getByText(/MTN MoMo · ending 456/)).toBeVisible();
    await expect(page.locator("body")).not.toContainText("677123456");

    // What the API actually stored (checked directly, with the same session).
    const token = await tokenOf(context);
    const state = await applicationOf(request, token);
    expect(state.application).toMatchObject({ status: "under_review", editable: false });
    expect(state.profile).toMatchObject({ displayName: "Amina Beauty", primaryNiche: "beauty", city: "douala", bio: BIO, photoFileId: null });
    expect(state.audience.platforms).toEqual([{ platform: "instagram", handle: "@amina.beauty", followers: 25000 }]);
    expect(state.audience.collaborations).toEqual([{ brandName: "MTN Cameroon", description: "Brand ambassador", year: 2024 }]);
    expect(state.audience.brandFit).toHaveLength(2);
    expect(state.rates).toMatchObject({ prices: [{ platform: "instagram", priceXaf: 85000 }], depositTerms: "full_in_escrow", payoutAccounts: [{ method: "mtn_momo", last3: "456" }] });
    expect(JSON.stringify(state)).not.toContain("677123456");

    // The browser only ever talked to the app, and no response carried the session, the payout number or the API address.
    expect(requests.filter((url) => url.includes(":4100") || url.includes("/api/v1/"))).toEqual([]);
    for (const response of bodies) {
      expect(response.text, response.url).not.toContain(token);
      expect(response.text, response.url).not.toContain("677123456");
    }
  });

  test("progress is kept: leaving mid-way and signing in again resumes with the saved values", async ({ page, context }) => {
    const email = await signUpCreator(page);
    await fillProfile(page, "Resume Creator");
    await expect(page).toHaveURL(STEP("audience"));
    await page.getByRole("checkbox", { name: /Instagram/ }).check();
    await page.getByLabel("Instagram handle").fill("@resume");
    await page.getByLabel("Instagram followers").fill("4,000");
    await page.getByRole("button", { name: /Beauty & Skincare/ }).click();
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL(STEP("rates"));

    await page.getByRole("button", { name: /sign out/i }).first().click();
    await expect(page).toHaveURL(`${APP}/sign-in`);
    await expect.poll(async () => sessionCookie(context)).toBeUndefined();

    await signIn(page, email);
    await expect(page).toHaveURL(STEP("profile")); // a pending creator's home is their application
    await expect(page.getByLabel("Creator name")).toHaveValue("Resume Creator");
    await expect(page.getByLabel("Niche")).toHaveValue("beauty");
    await page.goto(STEP("audience"));
    await expect(page.getByLabel("Instagram handle")).toHaveValue("@resume");
    await expect(page.getByLabel("Instagram followers")).toHaveValue("4,000");
    await expect(page.getByRole("button", { name: /Beauty & Skincare/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("steps cannot be skipped: audience needs a saved profile and rates need saved platforms", async ({ page }) => {
    await signUpCreator(page);
    await page.goto(STEP("audience"));
    await expect(page).toHaveURL(STEP("profile"));
    await page.goto(STEP("rates"));
    await expect(page).toHaveURL(STEP("profile"));
    await fillProfile(page);
    await expect(page).toHaveURL(STEP("audience"));
    await page.goto(STEP("rates"));
    await expect(page).toHaveURL(STEP("audience"));
  });

  test("client-side validation uses the API's limits and nothing is sent", async ({ page }) => {
    await signUpCreator(page);
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText("Enter your creator name.")).toBeVisible();
    await expect(page.getByText(/Write at least 40 characters/)).toBeVisible();
    await expect(page).toHaveURL(STEP("profile"));
  });

  test("a submitted application can be viewed but not edited again, and a duplicate submit does not create a second application", async ({ page, context, request }) => {
    await signUpCreator(page);
    await fillProfile(page);
    await fillAudience(page);
    await fillRates(page);
    await page.getByRole("button", { name: "Submit My Profile" }).dblclick();
    await expect(page).toHaveURL(STEP("submitted"));
    const token = await tokenOf(context);
    expect(await applicationCount(request, token)).toBe(1);
    for (const step of ["profile", "audience", "rates"]) {
      await page.goto(STEP(step));
      await expect(page).toHaveURL(STEP("submitted"));
    }
  });

  test("an application changed elsewhere is not overwritten: saving a locked application says so and nothing changes", async ({ page, context, request }) => {
    await signUpCreator(page);
    await fillProfile(page);
    await fillAudience(page);
    await expect(page).toHaveURL(STEP("rates"));
    await page.goto(STEP("profile")); // open the form while it is still a draft
    const token = await tokenOf(context);
    // Meanwhile the application is completed and submitted in another tab / device.
    expect((await apiSend(request, token, "put", "/creator/applications/current/rates", { prices: [{ platform: "instagram", priceXaf: 50000 }], minimumBooking: "1-week", deliverables: "One reel", revisionsRounds: 2, usageRightsMonths: 6, depositTerms: "full_in_escrow", payoutAccounts: [{ method: "mtn_momo", number: "677000111" }] })).status).toBe(200);
    expect((await apiSend(request, token, "post", "/creator/applications/current/submit", { confirmAccuracy: true })).status).toBe(200);

    await page.getByLabel("Creator name").fill("Edited after submission");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(alertOf(page)).toContainText("can no longer be edited");
    await expect(page).toHaveURL(STEP("profile"));
    expect((await applicationOf(request, token)).profile.displayName).toBe("Amina Beauty");
  });

  test("an ended session during the form says the changes were not saved, and signing in again returns to the step", async ({ page, context, request }) => {
    await signUpCreator(page);
    const token = await tokenOf(context);
    await request.post(`http://127.0.0.1:4100/api/v1/auth/logout`, { headers: { Cookie: `ioh_session=${token}` } }); // the session ends server-side
    await page.getByLabel("Creator name").fill("Typed before the session ended");
    await page.getByLabel("Niche").selectOption({ label: "Beauty" });
    await page.getByLabel("City").selectOption({ label: "Douala" });
    await page.getByLabel("About you").fill(BIO);
    await page.getByRole("button", { name: /continue/i }).click();
    const alert = alertOf(page);
    await expect(alert).toContainText(/session has ended/i);
    await expect(alert).toContainText(/not saved/i);
    await expect(page).toHaveURL(STEP("profile"));
    await expect(page.getByLabel("Creator name")).toHaveValue("Typed before the session ended"); // the form is kept
    await alert.getByRole("link", { name: "Sign in again" }).click();
    await expect(page).toHaveURL(/\/sign-in\?next=%2Ffor-creators%2Fapply%2Fprofile&expired=1/);
  });

  test("each creator only ever sees and changes their own application", async ({ browser, request }) => {
    const a = await browser.newContext();
    const pageA = await a.newPage();
    await signUpCreator(pageA);
    await fillProfile(pageA, "Creator A Only");
    await expect(pageA).toHaveURL(STEP("audience"));
    const aId = (await applicationOf(request, await tokenOf(a))).application.id;

    const b = await browser.newContext();
    const pageB = await b.newPage();
    await signUpCreator(pageB);
    await expect(pageB.getByLabel("Creator name")).toHaveValue("");
    await pageB.goto(`${STEP("submitted")}?id=${aId}`); // another creator's id in the URL is ignored
    await expect(pageB).toHaveURL(STEP("profile"));
    const bState = await applicationOf(request, await tokenOf(b));
    expect(bState.application.id).not.toBe(aId);
    expect(bState.profile.displayName).toBeNull();
    await a.close();
    await b.close();
  });

  test("brands and administrators cannot use the application", async ({ browser }) => {
    for (const [email, area] of [[ACCOUNTS.brand, "creator"], [ACCOUNTS.manager, "creator"]] as const) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await signIn(page, email);
      await expect(page).not.toHaveURL(/\/sign-in/);
      await page.goto(STEP("profile"));
      await expect(page).toHaveURL(new RegExp(`/sign-in\\?denied=${area}`));
      await context.close();
    }
  });

  test("a rejected application shows the reviewer's message and lets the creator apply again with their details kept", async ({ page, context, request }) => {
    await signUpCreator(page);
    await fillProfile(page, "Rejected Creator");
    await fillAudience(page);
    await fillRates(page);
    await page.getByRole("button", { name: "Submit My Profile" }).click();
    await expect(page).toHaveURL(STEP("submitted"));

    const token = await tokenOf(context);
    const id = (await applicationOf(request, token)).application.id;
    const manager = await managerToken(request);
    const reject = await apiSend(request, manager, "post", `/admin/creator-applications/${id}/reject`, { reason: "Please add clearer content samples." });
    expect(reject.status).toBe(200);

    await page.reload();
    await expect(alertOf(page)).toContainText("Please add clearer content samples.");
    await page.getByRole("button", { name: "Update and apply again" }).click();
    await expect(page).toHaveURL(STEP("profile"));
    await expect(page.getByLabel("Creator name")).toHaveValue("Rejected Creator");
    expect((await applicationOf(request, token)).application.status).toBe("draft");
  });

  test("an approved application unlocks the creator dashboard (approval ends the old session, so the creator signs in again)", async ({ page, context, request }) => {
    const email = await signUpCreator(page);
    await fillProfile(page);
    await fillAudience(page);
    await fillRates(page);
    await page.getByRole("button", { name: "Submit My Profile" }).click();
    await expect(page).toHaveURL(STEP("submitted"));
    await page.goto(`${APP}/creator/requests`);
    await expect(page).toHaveURL(STEP("submitted")); // still pending: sent back into the application area

    const token = await tokenOf(context);
    const id = (await applicationOf(request, token)).application.id;
    expect((await apiSend(request, await managerToken(request), "post", `/admin/creator-applications/${id}/approve`, {})).status).toBe(200);

    // The API revokes every session of a newly approved account, so the app treats the old one as ended and asks for a fresh sign-in.
    await page.goto(STEP("submitted"));
    await expect(page).toHaveURL(/\/sign-in\?next=%2Ffor-creators%2Fapply%2Fsubmitted&expired=1/);
    await expect(page.getByRole("status")).toContainText("Your session has ended");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Passw0rdtest");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page).toHaveURL(STEP("submitted"));
    await expect(page.getByText(/has been approved/)).toBeVisible();
    await page.getByRole("link", { name: "Go to Creator Dashboard" }).click();
    await expect(page).toHaveURL(`${APP}/creator/requests`);
  });
});
