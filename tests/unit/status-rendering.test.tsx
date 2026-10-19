// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as v from "@/lib/domain/vocabulary";
import * as labels from "@/lib/domain/labels";
import { offerView } from "../helpers";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/actions", () => ({ signInAction: vi.fn(), signUpAction: vi.fn(), signOutAction: vi.fn() }));
vi.mock("@/features/account/brand-payments/actions", () => ({ fundCampaignAction: vi.fn() }));
vi.mock("@/features/account/creator-payments/actions", () => ({ withdrawAction: vi.fn(), requestCashoutAction: vi.fn() }));
vi.mock("@/features/admin-panel/users/actions", () => ({ inviteTeamMemberAction: vi.fn(), userStatusAction: vi.fn() }));
vi.mock("@/features/admin-panel/support/actions", () => ({ createTicketAction: vi.fn() }));

const { EscrowBadge } = await import("@/components/shared/escrow-badge");
const { WithdrawalHistory } = await import("@/features/creator/earnings/sections/withdrawal-history");
const { RequestHistory } = await import("@/features/creator/requests/request-history");
const { AccountStatusBadge, AccountTypeTag, ComplianceIndicator } = await import("@/features/admin-panel/users/sections/user-badges");
const { StatusBadge: TicketStatusBadge } = await import("@/features/admin-panel/support/sections/ticket-badges");
const { FundCampaignDialog } = await import("@/features/account/brand-payments/sections/fund-campaign-dialog");
const { WithdrawDialog } = await import("@/features/account/creator-payments/sections/withdraw-dialog");
const { InviteForm } = await import("@/features/admin-panel/users/sections/invite-form");
const { NewTicketDialog } = await import("@/features/admin-panel/support/sections/new-ticket-dialog");

const withdrawal = (status: string, id = status) => ({ id, date: "2026-01-02", amount: 5000, method: "mtn_momo", phone: "670000001", status }) as never;
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
  it.each(v.WITHDRAWAL_STATUS.values)("history shows %s as its own state, not as processing or completed", (status) => {
    render(<WithdrawalHistory withdrawals={[withdrawal(status)]} />);
    const row = screen.getAllByRole("row")[1]!;
    expect(within(row).getByText(labels.WITHDRAWAL_STATUS_LABELS[status], { exact: false })).toBeInTheDocument();
    expect(row.textContent).not.toContain("Unknown");
  });

  it("an unexpected withdrawal status is shown as Unknown, not hidden or mislabeled", () => {
    render(<WithdrawalHistory withdrawals={[withdrawal("reversed")]} />);
    expect(screen.getAllByRole("row")[1]!.textContent).toContain("Unknown");
  });

  it("shows the payout network by label, never the API code", () => {
    render(<WithdrawalHistory withdrawals={[withdrawal("completed")]} />);
    expect(screen.getByText("MTN MoMo")).toBeInTheDocument();
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

describe("admin badges", () => {
  it.each(v.ACCOUNT_STATUS.values)("account status %s has a label", (status) => {
    const { container } = render(<AccountStatusBadge status={status} />);
    expect(container.textContent).toBe(labels.ACCOUNT_STATUS_LABELS[status]);
  });

  it("the account type tag keeps the admin wording: a creator is shown as 'influencer'", () => {
    const { container, rerender } = render(<AccountTypeTag type="creator" />);
    expect(container.textContent).toBe("influencer");
    rerender(<AccountTypeTag type="brand" />);
    expect(container.textContent).toBe("brand");
  });

  it.each(["verified", "in_review", "rejected", "missing"] as const)("compliance indicator %s renders", (status) => {
    const { container } = render(<ComplianceIndicator status={status} />);
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
  });

  it.each(v.TICKET_STATUS.values)("ticket status %s renders", (status) => {
    const { container } = render(<TicketStatusBadge status={status} />);
    // The ticket screen capitalises each word ("In Progress"); only the code (in_progress) must map to it.
    expect(container.textContent?.toLowerCase()).toBe(labels.TICKET_STATUS_LABELS[status].toLowerCase());
  });
});

describe("form values must match what the API accepts", () => {
  const optionValues = (selector: string, root: ParentNode = document) => [...root.querySelectorAll<HTMLInputElement | HTMLOptionElement>(selector)].map((el) => el.value);

  it("the fund form offers exactly the API's payment methods, by code, with readable labels", () => {
    render(<FundCampaignDialog creators={[]} />);
    expect(optionValues('input[name="method"]')).toEqual([...v.PAYMENT_METHOD.values]);
    for (const code of v.PAYMENT_METHOD.values) expect(document.body.textContent).toContain(labels.PAYMENT_METHOD_LABELS[code]);
  });

  it("the withdrawal form offers exactly the API's payout networks, by code", () => {
    render(<WithdrawDialog available={10_000} minimum={1_000} />);
    expect(optionValues('input[name="method"]')).toEqual([...v.PAYMENT_METHOD.values]);
  });

  it("the team invite form offers exactly the API's admin roles, by code, with the familiar labels", () => {
    render(<InviteForm />);
    expect(optionValues("select[name='role'] option")).toEqual([...v.ADMIN_ROLE.values]);
    expect([...document.querySelectorAll("select[name='role'] option")].map((o) => o.textContent)).toEqual(["Super Admin", "Campaign Manager", "Finance", "Support Agent"]);
  });

  it("the support ticket form sends API account types and priorities", () => {
    render(<NewTicketDialog />);
    expect(optionValues("select[name='fromRole'] option")).toEqual([...v.ACCOUNT_TYPE.values].reverse());
    expect(optionValues('input[name="priority"]').sort()).toEqual([...v.TICKET_PRIORITY.values].sort());
  });
});
