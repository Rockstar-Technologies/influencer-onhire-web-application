// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as v from "@/lib/domain/vocabulary";
import * as labels from "@/lib/domain/labels";
import { creatorWallet, offerView, withdrawalView } from "../helpers";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/actions", () => ({ signInAction: vi.fn(), signUpAction: vi.fn(), signOutAction: vi.fn() }));
vi.mock("@/features/payments/actions", () => ({ requestWithdrawalAction: vi.fn(), cancelWithdrawalAction: vi.fn() }));
vi.mock("@/features/admin-panel/support/actions", () => ({ createTicketAction: vi.fn() }));

const { EscrowBadge } = await import("@/components/shared/escrow-badge");
const { WithdrawPanel } = await import("@/features/payments/withdraw-panel");
const { RequestHistory } = await import("@/features/creator/requests/request-history");
const { StatusBadge: TicketStatusBadge } = await import("@/features/admin-panel/support/sections/ticket-badges");
const { NewTicketDialog } = await import("@/features/admin-panel/support/sections/new-ticket-dialog");

const withdrawal = (status: string) => withdrawalView({ status });
const request = (status: string) => offerView({ id: "44444444-4444-4444-8444-444444444444", status: status as never });

describe("payment statuses render for every API value and survive an unknown one", () => {
  it.each(v.PAYMENT_STATUS.values)("EscrowBadge shows a readable label for %s", (status) => {
    const { container } = render(<EscrowBadge status={status} />);
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
    expect(container.textContent).not.toContain("Unknown");
    expect(container.textContent).not.toContain("_");
  });

  it("EscrowBadge shows a neutral label (and does not crash) for a status the app does not know", () => {
    const { container } = render(<EscrowBadge status={"chargeback" as never} />);
    expect(container.textContent).toContain("Unknown");
  });
});

describe("withdrawal statuses", () => {
  it.each(v.WITHDRAWAL_STATUS.values)("the list shows %s as its own state", (status) => {
    render(<WithdrawPanel wallet={creatorWallet()} withdrawals={[withdrawal(status)]} />);
    const item = screen.getByRole("listitem");
    expect(item.textContent).not.toContain("Unknown");
    expect(item.textContent).not.toContain("_");
  });

  it("only requested or under-review withdrawals can be cancelled", () => {
    for (const status of v.WITHDRAWAL_STATUS.values) {
      const { unmount } = render(<WithdrawPanel wallet={creatorWallet()} withdrawals={[withdrawal(status)]} />);
      expect(screen.queryByRole("button", { name: /cancel request/i }) !== null, status).toBe(status === "requested" || status === "under_review");
      unmount();
    }
  });

  it("nothing but a completed withdrawal is described as paid, and an approved one says no money was sent", () => {
    for (const status of v.WITHDRAWAL_STATUS.values) {
      const { unmount } = render(<WithdrawPanel wallet={creatorWallet()} withdrawals={[withdrawal(status)]} />);
      const raw = screen.getByRole("listitem").textContent ?? "";
      if (status === "approved") expect(raw).toContain("no money has been sent");
      const text = raw.replace(/not been paid|no money has been sent/gi, "");
      if (status !== "completed") expect(text, status).not.toMatch(/\b(?:has been|was|is) (?:paid|sent)\b|\bpaid out\b/i);
      unmount();
    }
  });

  it("an unexpected withdrawal status is shown as Unknown, not hidden or mislabeled", () => {
    render(<WithdrawPanel wallet={creatorWallet()} withdrawals={[withdrawal("reversed")]} />);
    expect(screen.getByRole("listitem").textContent).toContain("Unknown");
  });

  it("shows the payout network by label, never the API code", () => {
    render(<WithdrawPanel wallet={creatorWallet()} withdrawals={[withdrawal("completed")]} />);
    expect(screen.getAllByText(/MTN MoMo/).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain("mtn_momo");
  });
});

describe("creator request (offer) statuses", () => {
  it.each(v.OFFER_STATUS.values.filter((status) => status !== "pending"))("history labels %s correctly (a withdrawn or expired request is not 'Declined')", (status) => {
    render(<RequestHistory offers={[request(status)]} />);
    expect(screen.getAllByRole("row")[1]!.textContent).toContain(labels.OFFER_STATUS_LABELS[status]);
    if (status !== "declined") expect(screen.getAllByRole("row")[1]!.textContent).not.toContain("Declined");
  });

  it("an unknown offer status is shown as Unknown", () => {
    render(<RequestHistory offers={[request("lapsed")]} />);
    expect(screen.getAllByRole("row")[1]!.textContent).toContain("Unknown");
  });
});

describe("support ticket badges (still sample data until the support module is connected)", () => {
  it.each(v.TICKET_STATUS.values)("ticket status %s renders", (status) => {
    const { container } = render(<TicketStatusBadge status={status} />);
    // The ticket screen capitalises each word ("In Progress"); only the code (in_progress) must map to it.
    expect(container.textContent?.toLowerCase()).toBe(labels.TICKET_STATUS_LABELS[status].toLowerCase());
  });
});

describe("form values must match what the API accepts", () => {
  const optionValues = (selector: string, root: ParentNode = document) => [...root.querySelectorAll<HTMLInputElement | HTMLOptionElement>(selector)].map((el) => el.value);

  it("the withdrawal form offers exactly the API's payout networks, by code", () => {
    render(<WithdrawPanel wallet={creatorWallet()} withdrawals={[]} />);
    expect(optionValues("select option")).toEqual([...v.PAYMENT_METHOD.values]);
  });

  it("the support ticket form sends API account types and priorities", () => {
    render(<NewTicketDialog />);
    expect(optionValues("select[name='fromRole'] option")).toEqual([...v.ACCOUNT_TYPE.values].reverse());
    expect(optionValues('input[name="priority"]').sort()).toEqual([...v.TICKET_PRIORITY.values].sort());
  });
});
