import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiConfigForTests } from "@/lib/api/config";
import nextConfig, { SECURITY_HEADERS } from "../../next.config";

const { GET } = await import("@/app/health/route");

describe("security headers and framework disclosure (F-4)", () => {
  it("applies the headers to every path and stops announcing the framework", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    const rules = await nextConfig.headers!();
    expect(rules).toHaveLength(1);
    expect(rules[0]!.source).toBe("/:path*");
    const sent = Object.fromEntries(rules[0]!.headers.map((h) => [h.key, h.value]));
    expect(sent).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    expect(sent["Permissions-Policy"]).toContain("camera=()");
    expect(sent["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(sent["Content-Security-Policy"]).toContain("object-src 'none'");
  });

  it("does not guess what only the owner can decide: no HSTS, no script/style/image sources, no invented image hosts", () => {
    const keys = SECURITY_HEADERS.map((h) => h.key);
    expect(keys).not.toContain("Strict-Transport-Security");
    const csp = SECURITY_HEADERS.find((h) => h.key === "Content-Security-Policy")!.value;
    expect(csp).not.toMatch(/script-src|style-src|img-src|default-src|unsafe-inline|unsafe-eval|\*/);
  });
});

describe("GET /health", () => {
  beforeEach(() => resetApiConfigForTests());
  afterEach(() => {
    vi.unstubAllEnvs();
    resetApiConfigForTests();
  });

  it("answers 200 only when the required production configuration is valid, and reveals nothing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("API_BASE_URL", "https://api.example.test/api/v1");
    vi.stubEnv("APP_ORIGIN", "https://app.example.test");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
    const response = GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers 503 with no detail when production configuration is missing, so a broken deployment is visible to the platform", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("API_BASE_URL", "");
    vi.stubEnv("APP_ORIGIN", "");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "");
    const response = GET();
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({ status: "misconfigured" });
    expect(body).not.toMatch(/API_BASE_URL|APP_ORIGIN|TRUSTED_PROXY_HOPS|http/);
  });

  it("an http API address in production without the explicit allowance is also reported as misconfigured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("API_BASE_URL", "http://api.example.test/api/v1");
    vi.stubEnv("APP_ORIGIN", "https://app.example.test");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
    expect(GET().status).toBe(503);
  });
});
