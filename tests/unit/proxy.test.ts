import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy, config } from "@/proxy";

const recorded = (response: Response) => response.headers.get("x-middleware-request-x-ioh-path");

describe("proxy", () => {
  it("records the requested path and query for server components", () => {
    expect(recorded(proxy(new NextRequest("http://127.0.0.1:3000/admin/users?q=a")))).toBe("/admin/users?q=a");
  });

  it("always overwrites a client-supplied value", () => {
    const request = new NextRequest("http://127.0.0.1:3000/brand/payments", { headers: { "x-ioh-path": "//evil.example" } });
    expect(recorded(proxy(request))).toBe("/brand/payments");
  });

  it("does not redirect, rewrite or block anything (it is not an authorization layer)", () => {
    const response = proxy(new NextRequest("http://127.0.0.1:3000/admin"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("skips static assets and image optimisation", () => {
    const matcher = new RegExp(`^${config.matcher[0]}$`);
    expect(matcher.test("/admin/users")).toBe(true);
    expect(matcher.test("/_next/static/chunk.js")).toBe(false);
    expect(matcher.test("/_next/image")).toBe(false);
    expect(matcher.test("/logo.svg")).toBe(false);
  });
});
