import { beforeEach, describe, expect, it, vi } from "vitest";

// Every privileged Server Action must check the session FIRST and must not reach its service when the check fails.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/action-access", () => ({
  authorizeAction: vi.fn(),
  PAYMENTS_NOT_CONNECTED: "Payments are not connected to the live service yet, so nothing was submitted and no money has been moved.",
}));
vi.mock("@/services/user-management.service");
vi.mock("@/services/payments.service", async () => ({ ...(await vi.importActual<object>("@/services/payments.service")), releasePayment: vi.fn(), requestCashout: vi.fn(), requestWithdrawal: vi.fn() }));
vi.mock("@/services/support.service");
vi.mock("@/services/influencers.service");

const { authorizeAction } = await import("@/lib/auth/action-access");
const users = await import("@/features/admin-panel/users/actions");
const support = await import("@/features/admin-panel/support/actions");
const adminPayments = await import("@/features/admin-panel/payments/actions");
const creatorPayments = await import("@/features/account/creator-payments/actions");
const userService = await import("@/services/user-management.service");
const paymentsService = await import("@/services/payments.service");
const supportService = await import("@/services/support.service");

const authorize = vi.mocked(authorizeAction);
const DENIED = { ok: false, message: "denied", reason: "wrong_role" } as const;
function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

const VALID_CASHOUT = { paymentId: "p1", summary: "I delivered the agreed reel and three stories.", links: "https://example.com/post" };
const VALID_WITHDRAW = { amount: "5000", method: "mtn_momo", phone: "670000001" };
const VALID_TICKET = { subject: "Payment question", message: "The brand asks about a release.", fromName: "Acme", fromRole: "brand", priority: "normal" };
const VALID_INVITE = { name: "New Admin", email: "new@admin.example", role: "support_agent" };

type Case = { name: string; requirement: object; run: () => Promise<unknown>; service: () => unknown };

const ADMIN = (permission: string) => ({ role: "admin", permission });

const CASES: Case[] = [
  { name: "suspend users", requirement: ADMIN("users.moderate"), run: () => users.userStatusAction(["u-1"], "suspend"), service: () => userService.applyUserAction },
  { name: "approve users", requirement: ADMIN("applications.review"), run: () => users.userStatusAction(["u-1"], "approve"), service: () => userService.applyUserAction },
  { name: "message users", requirement: ADMIN("users.moderate"), run: () => users.messageUsersAction(["u-1"], "Hello there", "A message long enough."), service: () => userService.sendUserMessage },
  { name: "flag a user", requirement: ADMIN("users.moderate"), run: () => users.toggleFlagAction("u-1", true), service: () => userService.setUserFlagged },
  { name: "dismiss a security alert", requirement: ADMIN("alerts.manage"), run: () => users.dismissAlertAction("a-1"), service: () => userService.dismissSecurityAlert },
  { name: "resolve a moderation flag", requirement: ADMIN("moderation.manage"), run: () => users.resolveFlagAction("f-1", "remove"), service: () => userService.resolveModerationFlag },
  { name: "invite a team member", requirement: ADMIN("team.manage"), run: () => users.inviteTeamMemberAction({ status: "idle" } as never, form(VALID_INVITE)), service: () => userService.inviteTeamMember },
  { name: "create a support ticket", requirement: ADMIN("tickets.manage"), run: () => support.createTicketAction({ status: "idle" } as never, form(VALID_TICKET)), service: () => supportService.createSupportTicket },
  { name: "release a payment", requirement: ADMIN("payments.release"), run: () => adminPayments.releasePaymentAction("pay-1"), service: () => paymentsService.releasePayment },
  { name: "request a cashout", requirement: { role: "creator" }, run: () => creatorPayments.requestCashoutAction({ status: "idle" }, form(VALID_CASHOUT)), service: () => paymentsService.requestCashout },
  { name: "withdraw funds", requirement: { role: "creator" }, run: () => creatorPayments.withdrawAction({ status: "idle" }, form(VALID_WITHDRAW)), service: () => paymentsService.requestWithdrawal },
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

describe("creator money actions that are not connected to the live service yet", () => {
  const session = { ok: true, session: {} } as never;

  it("cashout and withdraw: same honest refusal, never a success state", async () => {
    authorize.mockResolvedValue(session);
    const cashout = await creatorPayments.requestCashoutAction({ status: "idle" }, form(VALID_CASHOUT));
    const withdraw = await creatorPayments.withdrawAction({ status: "idle" }, form(VALID_WITHDRAW));
    for (const result of [cashout, withdraw]) expect(result).toMatchObject({ status: "error", message: expect.stringContaining("no money has been moved") });
    expect(paymentsService.requestCashout).not.toHaveBeenCalled();
    expect(paymentsService.requestWithdrawal).not.toHaveBeenCalled();
  });
});

describe("allowed administrators", () => {
  it("can still run the mock admin actions they are permitted to", async () => {
    authorize.mockResolvedValue({ ok: true, session: {} } as never);
    vi.mocked(userService.applyUserAction).mockResolvedValue([{ id: "u-1" } as never]);
    const result = await users.userStatusAction(["u-1"], "suspend");
    expect(result.ok).toBe(true);
    expect(userService.applyUserAction).toHaveBeenCalledOnce();
  });
});
