import { describe, expect, it } from "vitest";
import { afterSignUpFor, homeFor, sanitizeNext, signInUrl } from "@/lib/auth/paths";

const brand = { role: "brand", status: "active" } as const;
const creator = { role: "creator", status: "active" } as const;
const pendingCreator = { role: "creator", status: "pending" } as const;
const admin = { role: "admin", status: "active" } as const;

describe("homeFor / afterSignUpFor", () => {
  it("sends each role to its own area; a pending creator can only reach the application", () => {
    expect(homeFor(brand)).toBe("/brand/payments");
    expect(homeFor(creator)).toBe("/creator/requests");
    expect(homeFor(pendingCreator)).toBe("/for-creators/apply/profile");
    expect(homeFor(admin)).toBe("/admin");
  });

  it("starts new brands on campaign creation and new creators on the application", () => {
    expect(afterSignUpFor(brand)).toBe("/campaigns/new");
    expect(afterSignUpFor(pendingCreator)).toBe("/for-creators/apply/profile");
  });
});

describe("sanitizeNext", () => {
  it("accepts same-site paths inside the user's own areas", () => {
    expect(sanitizeNext("/brand/payments", brand)).toBe("/brand/payments");
    expect(sanitizeNext("/campaigns/new?draft=abc", brand)).toBe("/campaigns/new?draft=abc");
    expect(sanitizeNext("/influencers/amina/hire", brand)).toBe("/influencers/amina/hire");
    expect(sanitizeNext("/creator/earnings", creator)).toBe("/creator/earnings");
    expect(sanitizeNext("/admin/users", admin)).toBe("/admin/users");
  });

  it.each([
    "https://evil.example/brand/payments",
    "http://evil.example",
    "//evil.example",
    "//evil.example/brand",
    "/\\evil.example",
    "/brand\\..\\evil",
    "javascript:alert(1)",
    "brand/payments",
    "",
    "/%2F%2Fevil.example",
    "/brand/payments\r\nSet-Cookie: x=1",
    "/brand/\u0000x",
    "/sign-in",
    "/sign-in?next=/admin",
    "/login",
    `/brand/${"a".repeat(300)}`,
  ])("refuses %j", (value) => {
    expect(sanitizeNext(value, brand)).toBeNull();
  });

  it("refuses non-strings", () => {
    expect(sanitizeNext(undefined, brand)).toBeNull();
    expect(sanitizeNext(["/brand"], brand)).toBeNull();
    expect(sanitizeNext(42, brand)).toBeNull();
  });

  it("does not send a user into another role's area", () => {
    expect(sanitizeNext("/admin", brand)).toBeNull();
    expect(sanitizeNext("/admin/users", creator)).toBeNull();
    expect(sanitizeNext("/brand/payments", creator)).toBeNull();
    expect(sanitizeNext("/creator/earnings", admin)).toBeNull();
  });

  it("limits a pending creator to the application area", () => {
    expect(sanitizeNext("/for-creators/apply/rates", pendingCreator)).toBe("/for-creators/apply/rates");
    expect(sanitizeNext("/creator/earnings", pendingCreator)).toBeNull();
    expect(sanitizeNext("/brand/payments", pendingCreator)).toBeNull();
  });

  it("for an anonymous user only checks shape and known areas", () => {
    expect(sanitizeNext("/brand/payments", null)).toBe("/brand/payments");
    expect(sanitizeNext("/anything-else", null)).toBeNull();
    expect(sanitizeNext("//evil.example", null)).toBeNull();
  });
});

describe("signInUrl", () => {
  it("builds a sign-in link carrying only a safe next, a denied area and the expired flag", () => {
    expect(signInUrl()).toBe("/sign-in");
    expect(signInUrl({ next: "/admin/users" })).toBe("/sign-in?next=%2Fadmin%2Fusers");
    expect(signInUrl({ next: "https://evil.example" })).toBe("/sign-in");
    expect(signInUrl({ denied: "admin" })).toBe("/sign-in?denied=admin");
    expect(signInUrl({ expired: true })).toBe("/sign-in?expired=1");
  });
});
