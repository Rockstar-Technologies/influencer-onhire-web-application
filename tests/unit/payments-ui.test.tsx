// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { brandPayment, creatorPayment, creatorWallet, withdrawalView } from "../helpers";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh, push: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/payments/actions", () => ({
  requestWithdrawalAction: vi.fn(),
  cancelWithdrawalAction: vi.fn(),
  submitDeliveryReportAction: vi.fn(),
  decideDeliveryAction: vi.fn(),
  requestRefundReviewAction: vi.fn(),
  withdrawRefundReviewAction: vi.fn(),
}));

const actions = await import("@/features/payments/actions");
const { WithdrawPanel } = await import("@/features/payments/withdraw-panel");
const { DeliveryReportForm } = await import("@/features/payments/delivery-report-form");
const { DeliveryActions } = await import("@/features/payments/brand-payment-actions");
const labels = await import("@/features/payments/labels");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("withdraw panel", () => {
  it("below the minimum or with no balance there is no form, and simulated money is explained as not withdrawable", () => {
    render(<WithdrawPanel wallet={creatorWallet({ availableXaf: 0, includesSimulatedFunds: true })} withdrawals={[]} />);
    expect(screen.queryByRole("button", { name: /request withdrawal/i })).toBeNull();
    expect(screen.getByText(/no withdrawable balance/i).textContent).toMatch(/simulated.*can't be withdrawn/i);
  });

  it("makes no claims about fees being free or arrival times", () => {
    render(<WithdrawPanel wallet={creatorWallet()} withdrawals={[]} />);
    expect(document.body.textContent).not.toMatch(/free|24 hours|usually|on its way/i);
    expect(document.body.textContent).toContain("Withdrawal requests are subject to review");
  });

  it("validates locally without calling the action (minimum, maximum, junk)", () => {
    render(<WithdrawPanel wallet={creatorWallet()} withdrawals={[]} />);
    const submit = () => fireEvent.click(screen.getByRole("button", { name: /request withdrawal/i }));
    for (const [value, message] of [["", /whole FCFA/], ["abc", /whole FCFA/], ["500", /minimum/], ["10001", /at most/], ["12.5", /whole FCFA/]] as const) {
      fireEvent.change(screen.getByLabelText(/amount/i), { target: { value } });
      submit();
      expect(screen.getByRole("alert").textContent).toMatch(message);
    }
    expect(actions.requestWithdrawalAction).not.toHaveBeenCalled();
  });

  it("a double click sends one request; the same key is kept after an unclear outcome so a retry cannot duplicate", async () => {
    let release!: (v: unknown) => void;
    vi.mocked(actions.requestWithdrawalAction).mockImplementationOnce(() => new Promise((r) => (release = r)) as never);
    render(<WithdrawPanel wallet={creatorWallet()} withdrawals={[]} />);
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "5,000" } });
    const form = screen.getByRole("button", { name: /request withdrawal/i }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(actions.requestWithdrawalAction).toHaveBeenCalledTimes(1);
    release({ ok: false, error: { kind: "unavailable", requestId: null } });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/may or may not/));
    const first = vi.mocked(actions.requestWithdrawalAction).mock.calls[0]![0] as { key: string; amountXaf: number; method: string };
    expect(first).toMatchObject({ amountXaf: 5000, method: "mtn_momo" });
    vi.mocked(actions.requestWithdrawalAction).mockResolvedValueOnce({ ok: true, status: "requested", replayed: true });
    fireEvent.click(screen.getByRole("button", { name: /request withdrawal/i }));
    await waitFor(() => expect(actions.requestWithdrawalAction).toHaveBeenCalledTimes(2));
    expect((vi.mocked(actions.requestWithdrawalAction).mock.calls[1]![0] as { key: string }).key).toBe(first.key);
  });

  it("success says 'requested' and that nothing was paid; it never says money was sent", async () => {
    vi.mocked(actions.requestWithdrawalAction).mockResolvedValue({ ok: true, status: "requested", replayed: false });
    render(<WithdrawPanel wallet={creatorWallet()} withdrawals={[]} />);
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "2000" } });
    fireEvent.click(screen.getByRole("button", { name: /request withdrawal/i }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/requested.*nothing has been paid/i));
    expect(refresh).toHaveBeenCalled();
  });

  it("cancel is offered only after confirmation and shows the API's refusal", async () => {
    vi.mocked(actions.cancelWithdrawalAction).mockResolvedValue({ ok: false, error: { kind: "conflict", code: "withdrawal_not_cancellable", message: "This withdrawal can no longer be cancelled." } });
    render(<WithdrawPanel wallet={creatorWallet()} withdrawals={[withdrawalView()]} />);
    fireEvent.click(screen.getByRole("button", { name: /cancel request/i }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("can no longer be cancelled"));
    vi.mocked(window.confirm).mockReturnValue(false);
    vi.mocked(actions.cancelWithdrawalAction).mockClear();
    fireEvent.click(screen.getByRole("button", { name: /cancel request/i }));
    expect(actions.cancelWithdrawalAction).not.toHaveBeenCalled();
  });
});

describe("delivery report form", () => {
  it("validates summary and links locally and sends nothing until valid and confirmed", async () => {
    render(<DeliveryReportForm paymentId={creatorPayment().id} returnTo="/creator/payments" />);
    fireEvent.click(screen.getByRole("button", { name: /submit delivery report/i }));
    fireEvent.click(screen.getByRole("button", { name: /send report/i }));
    expect(screen.getByRole("alert").textContent).toMatch(/at least 20/);
    fireEvent.change(screen.getByLabelText(/what did you deliver/i), { target: { value: "I delivered the reel and three stories." } });
    fireEvent.change(screen.getByLabelText(/links/i), { target: { value: "not a link" } });
    fireEvent.click(screen.getByRole("button", { name: /send report/i }));
    expect(screen.getByRole("alert").textContent).toMatch(/https/);
    expect(actions.submitDeliveryReportAction).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/links/i), { target: { value: "https://example.com/a\nhttps://example.com/b" } });
    vi.mocked(actions.submitDeliveryReportAction).mockResolvedValue({ ok: true, status: "requested" });
    fireEvent.click(screen.getByRole("button", { name: /send report/i }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/not a payment/));
    expect(vi.mocked(actions.submitDeliveryReportAction).mock.calls[0]![0]).toMatchObject({ links: ["https://example.com/a", "https://example.com/b"] });
  });
});

describe("brand delivery actions follow the API's hints", () => {
  const names = () => screen.queryAllByRole("button").map((b) => b.textContent);
  it("held: only a refund review request; requested: acknowledge and dispute; disputed: withdraw", () => {
    const { unmount } = render(<DeliveryActions payment={brandPayment()} />);
    expect(names()).toEqual(["Request refund review"]);
    unmount();
    const r = render(<DeliveryActions payment={brandPayment({ status: "requested", actions: { canAcknowledge: true, canDispute: true, canWithdrawDispute: false } })} />);
    expect(names()).toEqual(["Acknowledge delivery", "Dispute delivery"]);
    r.unmount();
    render(<DeliveryActions payment={brandPayment({ status: "requested", actions: { canAcknowledge: false, canDispute: false, canWithdrawDispute: true } })} />);
    expect(names()).toEqual(["Withdraw dispute"]);
  });
  it("released or refunded payments offer nothing, and no brand screen ever shows the fee or net", () => {
    const { container } = render(<DeliveryActions payment={brandPayment({ status: "released" })} />);
    expect(container.textContent).toBe("");
  });
});

describe("wording", () => {
  it("brand notes never show money amounts and the creator sees released simulated money as test money", () => {
    expect(labels.brandDeliveryNote(brandPayment())).toBeNull();
    expect(labels.creatorPaymentInfo(creatorPayment({ status: "released", simulated: true })).note).toMatch(/test money.*can't be withdrawn/);
    expect(labels.creatorPaymentInfo(creatorPayment({ status: "requested" })).note).not.toMatch(/released to your balance/);
    expect(labels.creatorPaymentInfo(creatorPayment({ status: "requested", dispute: { id: "11111111-1111-4111-8111-111111111111", status: "open", reason: "x", awaitingPolicyDecision: false } })).label).toBe("Disputed");
  });
});
