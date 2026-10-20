import { beforeEach, describe, expect, it, vi } from "vitest";

// Every privileged Server Action must check the session FIRST and must not reach its service when the check fails.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/action-access", () => ({
  authorizeAction: vi.fn(),
}));
vi.mock("@/services/user-management.service");
vi.mock("@/services/support.service");
vi.mock("@/services/influencers.service");

const { authorizeAction } = await import("@/lib/auth/action-access");
const support = await import("@/features/admin-panel/support/actions");
const supportService = await import("@/services/support.service");

const authorize = vi.mocked(authorizeAction);
const DENIED = { ok: false, message: "denied", reason: "wrong_role" } as const;
function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

const VALID_TICKET = { subject: "Payment question", message: "The brand asks about a release.", fromName: "Acme", fromRole: "brand", priority: "normal" };

type Case = { name: string; requirement: object; run: () => Promise<unknown>; service: () => unknown };

const ADMIN = (permission: string) => ({ role: "admin", permission });

const CASES: Case[] = [
  { name: "create a support ticket", requirement: ADMIN("tickets.manage"), run: () => support.createTicketAction({ status: "idle" } as never, form(VALID_TICKET)), service: () => supportService.createSupportTicket },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe.each(CASES)("$name", ({ requirement, run, service }) => {
  it("asks for exactly the right role/permission", async () => {
    authorize.mockResolvedValue(DENIED);
    await run();
    expect(authorize).toHaveBeenCalledWith(requirement);
  });

  it("does nothing when the caller is not allowed (anonymous, wrong role, missing permission)", async () => {
    authorize.mockResolvedValue(DENIED);
    const result = await run();
    expect(service()).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).toContain("denied");
  });
});
