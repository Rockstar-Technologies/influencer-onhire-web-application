import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run a PRODUCTION build of this app against REAL Express API instances that use a DISPOSABLE database (never the
 * development database). No payment provider and no e-mail service are involved. See tests/e2e/README.md for how to start the APIs.
 *
 *   main app   : http://127.0.0.1:3100 -> API on :4100 (high rate limits, TRUST_PROXY=0), TRUSTED_PROXY_HOPS=0
 *   rate limit : http://127.0.0.1:3101 -> API on :4101 (3 login attempts / 15 min per IP, TRUST_PROXY=1), TRUSTED_PROXY_HOPS=1
 */
const API_MAIN = process.env.E2E_API_URL ?? "http://127.0.0.1:4100/api/v1";
const API_RATE = process.env.E2E_API_RATELIMIT_URL ?? "http://127.0.0.1:4101/api/v1";

function appServer(port: number, apiBaseUrl: string, hops: number) {
  return {
    command: `npm run start -- --port ${port} --hostname 127.0.0.1`,
    url: `http://127.0.0.1:${port}/sign-in`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NODE_ENV: "production",
      API_BASE_URL: apiBaseUrl,
      API_ALLOW_INSECURE_HTTP: "true", // the test API is on plain http on loopback
      APP_ORIGIN: `http://127.0.0.1:${port}`,
      TRUSTED_PROXY_HOPS: String(hops),
    },
  };
}

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { trace: "off", screenshot: "off" },
  // Default: the Chromium build that Playwright downloads. Set E2E_BROWSER_CHANNEL=chrome to use an installed Google Chrome instead.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], ...(process.env.E2E_BROWSER_CHANNEL ? { channel: process.env.E2E_BROWSER_CHANNEL } : {}) } }],
  webServer: [appServer(3100, API_MAIN, 0), appServer(3101, API_RATE, 1)],
});
