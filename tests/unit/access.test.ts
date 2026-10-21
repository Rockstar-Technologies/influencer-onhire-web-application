import type { PermissionCode } from "@/lib/domain/vocabulary";
import { describe, expect, it } from "vitest";
import { decideAccess } from "@/lib/auth/access";
import type { Session } from "@/lib/auth/access";

function session(role: "brand" | "creator" | "admin", status: "pending" | "active" | "suspended" | "rejected" = "active", permissions: PermissionCode[] = []): Session {
  return {
    user: { id: "00000000-0000-4000-8000-000000000001", email: "a@b.cc", fullName: "A B", phone: null, role, status, restricted: status !== "active", createdAt: "2026-01-01T00:00:00.000Z" },
    permissions,
    expiresAt: null,
  };
}

describe("decideAccess", () => {
  it("denies anonymous visitors everywhere", () => {
    for (const requirement of [{ role: "brand" }, { role: "creator" }, { role: "admin" }] as const) {
      expect(decideAccess(null, requirement)).toEqual({ allowed: false, reason: "anonymous" });
    }
  });

  it("allows only the matching role", () => {
    expect(decideAccess(session("brand"), { role: "brand" }).allowed).toBe(true);
    expect(decideAccess(session("brand"), { role: "creator" })).toEqual({ allowed: false, reason: "wrong_role" });
    expect(decideAccess(session("brand"), { role: "admin" })).toEqual({ allowed: false, reason: "wrong_role" });
    expect(decideAccess(session("creator"), { role: "brand" })).toEqual({ allowed: false, reason: "wrong_role" });
    expect(decideAccess(session("admin"), { role: "brand" })).toEqual({ allowed: false, reason: "wrong_role" });
  });

  it("lets a pending creator reach ONLY what allows pending creators", () => {
    expect(decideAccess(session("creator", "pending"), { role: "creator" })).toEqual({ allowed: false, reason: "pending_creator" });
    expect(decideAccess(session("creator", "pending"), { role: "creator", allowPending: false })).toEqual({ allowed: false, reason: "pending_creator" });
    expect(decideAccess(session("creator", "pending"), { role: "creator", allowPending: true })).toEqual({ allowed: true });
    expect(decideAccess(session("creator", "pending"), { role: "brand" })).toEqual({ allowed: false, reason: "wrong_role" });
  });

  it("denies suspended and rejected accounts even if a stale session exists", () => {
    for (const status of ["suspended", "rejected"] as const) {
      expect(decideAccess(session("brand", status), { role: "brand" })).toEqual({ allowed: false, reason: "inactive" });
      expect(decideAccess(session("creator", status), { role: "creator", allowPending: true })).toEqual({ allowed: false, reason: "inactive" });
      expect(decideAccess(session("admin", status), { role: "admin" })).toEqual({ allowed: false, reason: "inactive" });
    }
  });

  it("checks admin permissions by code", () => {
    const finance = session("admin", "active", ["payments.view", "payments.release"]);
    expect(decideAccess(finance, { role: "admin", permission: "payments.release" })).toEqual({ allowed: true });
    expect(decideAccess(finance, { role: "admin", permission: "users.moderate" })).toEqual({ allowed: false, reason: "missing_permission" });
    expect(decideAccess(finance, { role: "admin" })).toEqual({ allowed: true });
    expect(decideAccess(session("admin"), { role: "admin", permission: "payments.release" })).toEqual({ allowed: false, reason: "missing_permission" });
  });
});
