// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TARGET_ID } from "../helpers";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh }), usePathname: () => "/admin", useSearchParams: () => new URLSearchParams(), notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
const fa = { dismissDisputeAction: vi.fn(), upholdDisputeAction: vi.fn(), decideRefundRequestAction: vi.fn(), createRefundAction: vi.fn(), cancelRefundAction: vi.fn(), decideWithdrawalAction: vi.fn(), actOnIssueAction: vi.fn() };
vi.mock("@/features/admin/finance-actions", () => ({ ...Object.fromEntries(Object.entries(fa).map(([k]) => [k, (...a: unknown[]) => (fa as Record<string, (...x: unknown[]) => unknown>)[k]!(...a)])) }));

const { DisputeDecision, RefundCreate, WithdrawalDecision, RefundRequestDecision, IssueDecision } = await import("@/features/admin/finance-decisions");

const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const names = () => screen.queryAllByRole("button").map((b) => b.textContent);
const base = { paymentId: TARGET_ID, me: ME, mayDismiss: true, mayUphold: true, canResolve: true, canPropose: true, awaitingSecond: false, outcome: null };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("dispute decision buttons follow the two-administrator rule", () => {
  it("open dispute, no proposal: dismiss or propose", () => {
    render(<DisputeDecision {...base} />);
    expect(names()).toEqual(["Dismiss dispute", "Propose to uphold"]);
  });
  it("the proposer sees only 'withdraw my proposal' and is told another administrator must decide", () => {
    render(<DisputeDecision {...base} canPropose={false} canResolve={false} awaitingSecond outcome={{ status: "proposed", proposedBy: ME }} />);
    expect(names()).toEqual(["Withdraw my proposal"]);
  });
  it("a different administrator may confirm or decline, never withdraw; dismiss is hidden while a proposal is pending", () => {
    render(<DisputeDecision {...base} canPropose={false} awaitingSecond outcome={{ status: "proposed", proposedBy: OTHER }} />);
    expect(names()).toEqual(["Confirm upholding", "Decline proposal"]);
  });
  it("without disputes.uphold only dismissal is offered; without payments.release only upholding", () => {
    const a = render(<DisputeDecision {...base} mayUphold={false} />);
    expect(names()).toEqual(["Dismiss dispute"]);
    a.unmount();
    render(<DisputeDecision {...base} mayDismiss={false} />);
    expect(names()).toEqual(["Propose to uphold"]);
  });
  it("proposing needs a note, asks first, and says no money is returned", async () => {
    fa.upholdDisputeAction.mockResolvedValue({ ok: true, status: "propose" });
    const user = userEvent.setup();
    render(<DisputeDecision {...base} />);
    await user.click(screen.getByRole("button", { name: "Propose to uphold" }));
    expect(screen.getByText(/returns no money/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Confirm/ }));
    expect(fa.upholdDisputeAction).not.toHaveBeenCalled();
    await user.type(screen.getByRole("textbox"), "The creator never posted.");
    await user.click(screen.getByRole("button", { name: /^Confirm/ }));
    await waitFor(() => expect(fa.upholdDisputeAction).toHaveBeenCalledWith({ id: TARGET_ID, kind: "propose", note: "The creator never posted." }));
  });
  it("an API refusal is shown with 'Nothing was changed', not as success", async () => {
    fa.upholdDisputeAction.mockResolvedValue({ ok: false, error: { kind: "conflict", code: "second_confirmation_required", message: "A different administrator must confirm." } });
    const user = userEvent.setup();
    render(<DisputeDecision {...base} canPropose={false} awaitingSecond outcome={{ status: "proposed", proposedBy: OTHER }} />);
    await user.click(screen.getByRole("button", { name: "Confirm upholding" }));
    await user.type(screen.getByRole("textbox"), "Agreed with the evidence.");
    await user.click(screen.getByRole("button", { name: /^Confirm/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/different administrator.*Nothing was changed/);
  });
});

describe("refund, withdrawal and request wording never claims money moved", () => {
  it("recording a refund states what it is, and a retry after an unclear answer reuses the same key", async () => {
    fa.createRefundAction.mockResolvedValueOnce({ ok: false, error: { kind: "unavailable", requestId: null } }).mockResolvedValueOnce({ ok: true, status: "pending" });
    const user = userEvent.setup();
    render(<RefundCreate paymentId={TARGET_ID} canRefund simulated={false} />);
    await user.click(screen.getByRole("button", { name: "Record full refund" }));
    expect(screen.getByText(/No provider refund exists/)).toBeInTheDocument();
    await user.type(screen.getByRole("textbox"), "Creator never started.");
    await user.click(screen.getByRole("button", { name: /^Confirm/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/may or may not/);
    await user.click(screen.getByRole("button", { name: /^Confirm/ }));
    await waitFor(() => expect(fa.createRefundAction).toHaveBeenCalledTimes(2));
    expect(fa.createRefundAction.mock.calls[1]![0].key).toBe(fa.createRefundAction.mock.calls[0]![0].key);
    expect(await screen.findByRole("status")).toHaveTextContent("No money has been returned");
  });
  it("a simulated payment's refund is labelled bookkeeping", async () => {
    const user = userEvent.setup();
    render(<RefundCreate paymentId={TARGET_ID} canRefund simulated />);
    await user.click(screen.getByRole("button", { name: "Record full refund" }));
    expect(screen.getByText(/simulated.*no real money moves/i)).toBeInTheDocument();
  });
  it("no refund button when the API says it is not refundable", () => {
    render(<RefundCreate paymentId={TARGET_ID} canRefund={false} simulated />);
    expect(names()).toEqual([]);
    expect(screen.getByText(/can't be recorded/)).toBeInTheDocument();
  });
  it("approving a withdrawal says nothing is paid; rejecting says the amount returns to the balance", async () => {
    fa.decideWithdrawalAction.mockResolvedValue({ ok: true, status: "approved" });
    const user = userEvent.setup();
    render(<WithdrawalDecision id={TARGET_ID} canApprove canReject />);
    await user.click(screen.getByRole("button", { name: "Approve for payout" }));
    expect(screen.getByText(/nothing is paid/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Confirm/ }));
    expect(await screen.findByRole("status")).toHaveTextContent("Nothing has been paid");
  });
  it("only the buttons the API flags for the withdrawal exist", () => {
    const a = render(<WithdrawalDecision id={TARGET_ID} canApprove={false} canReject />);
    expect(names()).toEqual(["Reject request"]);
    a.unmount();
    render(<WithdrawalDecision id={TARGET_ID} canApprove={false} canReject={false} />);
    expect(names()).toEqual([]);
  });
  it("accepting a refund request says it creates no refund", async () => {
    fa.decideRefundRequestAction.mockResolvedValue({ ok: true, status: "accepted" });
    const user = userEvent.setup();
    render(<RefundRequestDecision id={TARGET_ID} canDecide />);
    await user.click(screen.getByRole("button", { name: "Accept request" }));
    expect(screen.getByText(/does not create or complete a refund/)).toBeInTheDocument();
    await user.type(screen.getByRole("textbox"), "Eligible after review.");
    await user.click(screen.getByRole("button", { name: /^Confirm/ }));
    expect(await screen.findByRole("status")).toHaveTextContent("No refund has been created");
  });
  it("issue buttons follow the API's canResolve/canDismiss hints, and a double click sends once", async () => {
    let release!: (v: unknown) => void;
    fa.actOnIssueAction.mockImplementationOnce(() => new Promise((r) => (release = r)));
    render(<IssueDecision id={TARGET_ID} canResolve canDismiss={false} />);
    expect(names()).toEqual(["Resolve with a note"]);
    fireEvent.click(screen.getByRole("button", { name: "Resolve with a note" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Checked with the provider." } });
    const confirm = screen.getByRole("button", { name: /^Confirm/ });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(fa.actOnIssueAction).toHaveBeenCalledTimes(1);
    release({ ok: true, status: "resolved" });
    expect(await screen.findByRole("status")).toHaveTextContent("No payment was changed");
  });
});
