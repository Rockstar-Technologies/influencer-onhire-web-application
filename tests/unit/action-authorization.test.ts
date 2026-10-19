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
const support = await import("@/features/admin-panel/support/actions");
const creatorPayments = await import("@/features/account/creator-payments/actions");
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

type Case = { name: string; requirement: object; run: () => Promise<unknown>; service: () => unknown };

const ADMIN = (permission: string) => ({ role: "admin", permission });

const CASES: Case[] = [
  { name: "create a support ticket", requirement: ADMIN("tickets.manage"), run: () => support.createTicketAction({ status: "idle" } as never, form(VALID_TICKET)), service: () => supportService.createSupportTicket },
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
