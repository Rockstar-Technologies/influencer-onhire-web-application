import { describe, expect, it } from "vitest";
import { parseApiConfig } from "@/lib/api/config";
import { ApiConfigError } from "@/lib/api/errors";

const PROD = {
  NODE_ENV: "production",
  API_BASE_URL: "https://api.internal.example/api/v1",
  APP_ORIGIN: "https://app.example.com",
  TRUSTED_PROXY_HOPS: "1",
};

describe("parseApiConfig", () => {
  it("uses clearly-local development defaults outside production", () => {
    const config = parseApiConfig({ NODE_ENV: "development" });
    expect(config.baseUrl).toBe("http://localhost:4000/api/v1");
    expect(config.trustedProxyHops).toBe(0);
    expect(config.appOrigins).toContain("http://localhost:3000");
    expect(config.timeoutMs).toBe(10_000);
    expect(config.upstreamCookieName).toBe("ioh_session");
    expect(config.isProduction).toBe(false);
  });

  it("accepts a complete production configuration and normalises the base URL", () => {
    const config = parseApiConfig({ ...PROD, API_BASE_URL: "https://api.internal.example/api/v1/" });
    expect(config.baseUrl).toBe("https://api.internal.example/api/v1");
    expect(config.appOrigins).toEqual(["https://app.example.com"]);
    expect(config.trustedProxyHops).toBe(1);
    expect(config.isProduction).toBe(true);
  });

  it.each([
    ["API_BASE_URL", { API_BASE_URL: undefined }],
    ["APP_ORIGIN", { APP_ORIGIN: undefined }],
    ["TRUSTED_PROXY_HOPS", { TRUSTED_PROXY_HOPS: undefined }],
  ])("fails closed in production when %s is missing (nothing is guessed)", (name, override) => {
    expect(() => parseApiConfig({ ...PROD, ...override })).toThrow(ApiConfigError);
    expect(() => parseApiConfig({ ...PROD, ...override })).toThrow(new RegExp(name));
  });

  it("accepts an explicit TRUSTED_PROXY_HOPS of 0 in production", () => {
    expect(parseApiConfig({ ...PROD, TRUSTED_PROXY_HOPS: "0" }).trustedProxyHops).toBe(0);
  });

  it("requires https for the API in production unless a private hop is explicitly allowed", () => {
    expect(() => parseApiConfig({ ...PROD, API_BASE_URL: "http://api.internal.example/api/v1" })).toThrow(/https/);
    expect(parseApiConfig({ ...PROD, API_BASE_URL: "http://api.internal.example/api/v1", API_ALLOW_INSECURE_HTTP: "true" }).baseUrl).toBe(
      "http://api.internal.example/api/v1",
    );
  });

  it.each([
    "not a url",
    "ftp://api.example/api/v1",
    "https://user:pass@api.example/api/v1",
    "https://api.example/api/v1?x=1",
    "https://api.example/api/v1#frag",
  ])("rejects an unsafe API_BASE_URL: %s", (value) => {
    expect(() => parseApiConfig({ NODE_ENV: "development", API_BASE_URL: value })).toThrow(ApiConfigError);
  });

  it("requires https and bare origins for APP_ORIGIN in production", () => {
    expect(() => parseApiConfig({ ...PROD, APP_ORIGIN: "http://app.example.com" })).toThrow(/https/);
    expect(() => parseApiConfig({ ...PROD, APP_ORIGIN: "http://10.0.0.5" })).toThrow(/https/);
    expect(() => parseApiConfig({ ...PROD, APP_ORIGIN: "https://app.example.com/path" })).toThrow(/bare origins/);
    expect(parseApiConfig({ ...PROD, APP_ORIGIN: "https://a.example.com, https://b.example.com" }).appOrigins).toEqual([
      "https://a.example.com",
      "https://b.example.com",
    ]);
  });

  it("accepts plain http for APP_ORIGIN only on a loopback address (a local production build)", () => {
    expect(parseApiConfig({ ...PROD, APP_ORIGIN: "http://127.0.0.1:3100" }).appOrigins).toEqual(["http://127.0.0.1:3100"]);
    expect(parseApiConfig({ ...PROD, APP_ORIGIN: "http://localhost:3000" }).appOrigins).toEqual(["http://localhost:3000"]);
  });

  it.each(["-1", "6", "1.5", "abc", "true"])("rejects TRUSTED_PROXY_HOPS=%s", (value) => {
    expect(() => parseApiConfig({ NODE_ENV: "development", TRUSTED_PROXY_HOPS: value })).toThrow(/TRUSTED_PROXY_HOPS/);
  });

  it.each(["100", "70000", "x"])("rejects API_TIMEOUT_MS=%s", (value) => {
    expect(() => parseApiConfig({ NODE_ENV: "development", API_TIMEOUT_MS: value })).toThrow(/API_TIMEOUT_MS/);
  });

  it("rejects a cookie name with unsafe characters", () => {
    expect(() => parseApiConfig({ NODE_ENV: "development", API_SESSION_COOKIE_NAME: "bad name;" })).toThrow(/cookie name/);
  });
});
