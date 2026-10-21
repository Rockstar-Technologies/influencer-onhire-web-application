import type { PermissionCode } from "@/lib/domain/vocabulary";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/access";
import { apiUser } from "../helpers";

vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn() }));

const { getSession } = await import("@/lib/auth/session");
const route = await import("@/app/admin/export/route");

const session = (role: "brand" | "creator" | "admin", permissions: PermissionCode[] = []): Session => ({
  user: apiUser({ role, phone: role === "admin" ? null : "670000001" }) as Session["user"],
  permissions,
  expiresAt: null,
});


beforeEach(() => vi.mocked(getSession).mockReset());

describe("GET /admin/export", () => {
  it("answers 401 to an anonymous caller and returns no data", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const response = await route.GET();
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain("Platform revenue");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each([
    ["a brand", session("brand")],
    ["a creator", session("creator")],
    ["an administrator without dashboard.export", session("admin", ["dashboard.view", "payments.view"])],
  ])("answers 403 to %s", async (_name, who) => {
    vi.mocked(getSession).mockResolvedValue(who);
    const response = await route.GET();
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain("Platform revenue");
  });

  it("tells an administrator holding dashboard.export that there is nothing to export (no invented data), never cached", async () => {
    vi.mocked(getSession).mockResolvedValue(session("admin", ["dashboard.export"]));
    const response = await route.GET();
    expect(response.status).toBe(501);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ error: "export_not_available" });
    expect(text).not.toMatch(/revenue|campaign|Influencer On Hire dashboard report/i);
  });

  it("refuses every state-changing method", async () => {
    for (const handler of [route.POST, route.PUT, route.PATCH, route.DELETE]) {
      const response = handler();
      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("GET");
    }
    expect(getSession).not.toHaveBeenCalled();
  });
});
