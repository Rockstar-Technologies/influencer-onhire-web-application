import { describe, expect, it } from "vitest";
import { verifyRequestOrigin } from "@/lib/security/origin";

const ALLOWED = ["https://app.example.com"];
const req = (method: string, headers: Record<string, string> = {}) => ({
  method,
  headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
});

describe("verifyRequestOrigin", () => {
  it("does not apply to safe methods", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) expect(verifyRequestOrigin(req(method), ALLOWED)).toEqual({ ok: true });
  });

  it("accepts a state-changing request from an allowed origin", () => {
    expect(verifyRequestOrigin(req("POST", { origin: "https://app.example.com" }), ALLOWED)).toEqual({ ok: true });
  });

  it.each([
    ["missing Origin", {}],
    ["foreign Origin", { origin: "https://evil.example" }],
    ["opaque Origin", { origin: "null" }],
    ["look-alike Origin", { origin: "https://app.example.com.evil.example" }],
    ["scheme downgrade", { origin: "http://app.example.com" }],
    ["different port", { origin: "https://app.example.com:8443" }],
  ])("refuses %s", (_name, headers) => {
    expect(verifyRequestOrigin(req("POST", headers), ALLOWED)).toEqual({ ok: false, reason: "origin" });
  });

  it("refuses cross-site fetches even with an allowed Origin", () => {
    expect(verifyRequestOrigin(req("DELETE", { origin: "https://app.example.com", "sec-fetch-site": "cross-site" }), ALLOWED)).toEqual({ ok: false, reason: "fetch_site" });
    expect(verifyRequestOrigin(req("POST", { origin: "https://app.example.com", "sec-fetch-site": "same-site" }), ALLOWED)).toEqual({ ok: false, reason: "fetch_site" });
    expect(verifyRequestOrigin(req("POST", { origin: "https://app.example.com", "sec-fetch-site": "same-origin" }), ALLOWED)).toEqual({ ok: true });
  });

  it("can require JSON so a plain HTML form cannot post to a handler", () => {
    const base = { origin: "https://app.example.com" };
    expect(verifyRequestOrigin(req("POST", { ...base, "content-type": "application/x-www-form-urlencoded" }), ALLOWED, { requireJson: true })).toEqual({ ok: false, reason: "content_type" });
    expect(verifyRequestOrigin(req("POST", { ...base, "content-type": "multipart/form-data; boundary=x" }), ALLOWED, { requireJson: true })).toEqual({ ok: false, reason: "content_type" });
    expect(verifyRequestOrigin(req("POST", { ...base, "content-type": "application/json; charset=utf-8" }), ALLOWED, { requireJson: true })).toEqual({ ok: true });
  });

  it("refuses everything state-changing when no origin is allowed", () => {
    expect(verifyRequestOrigin(req("POST", { origin: "https://app.example.com" }), [])).toEqual({ ok: false, reason: "origin" });
  });
});
