import { expect, test } from "@playwright/test";
import { APP } from "./helpers";

test.describe("deployment safety on the production build", () => {
  test("the health probe answers only for a valid configuration, and nothing announces the framework", async ({ request }) => {
    const health = await request.get(`${APP}/health`);
    expect(health.status()).toBe(200);
    expect(await health.json()).toEqual({ status: "ok" });
    expect(health.headers()["cache-control"]).toBe("no-store");
    expect((await request.post(`${APP}/health`, { data: {} })).status()).toBe(405);

    for (const path of ["/", "/sign-in", "/influencers", "/for-brands"]) {
      const headers = (await request.get(`${APP}${path}`)).headers();
      expect(headers["x-powered-by"], path).toBeUndefined();
      expect(headers["x-content-type-options"], path).toBe("nosniff");
      expect(headers["x-frame-options"], path).toBe("DENY");
      expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
      expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
    }
  });

  test("public pages show no invented figure, generated creator or payout-timing promise", async ({ page }) => {
    for (const path of ["/", "/for-brands", "/about", "/campaigns"]) {
      await page.goto(`${APP}${path}`);
      const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
      expect(text.length, path).toBeGreaterThan(200);
      for (const invented of [/1,284/, /340\+/, /25M\+/, /1\.2\s?m\b/i, /300\+/, /Combined Audience Reach/, /Brands Partnered/, /typical time to receive a withdrawal/i, /Content niches/, /Cities covered/, /trusted by .* brands/i]) {
        expect(text, `${path} ${invented}`).not.toMatch(invented);
      }
    }
  });
});
