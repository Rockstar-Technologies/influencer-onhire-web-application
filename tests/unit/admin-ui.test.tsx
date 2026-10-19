// @vitest-environment jsdom
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TARGET_ID, adminApplicationDetail, adminApplicationItem, adminCampaignDetail, adminCampaignItem, adminPaymentDetail, adminUserDetail, adminUserItem } from "../helpers";
import { RedirectSignal } from "../mocks/next";

const refresh = vi.fn();
const moderateUserAction = vi.fn();
const decideApplicationAction = vi.fn();
const decideCampaignAction = vi.fn();
const releasePaymentAction = vi.fn();
const s = {
  loadUsers: vi.fn(),
  loadUser: vi.fn(),
  loadApplications: vi.fn(),
  loadApplication: vi.fn(),
  loadReviewCampaigns: vi.fn(),
  loadReviewCampaign: vi.fn(),
  loadPayments: vi.fn(),
  loadPayment: vi.fn(),
  queueSize: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh }),
  usePathname: () => "/admin",
  useSearchParams: () => new URLSearchParams(),
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/features/admin/actions", () => ({
  moderateUserAction: (...a: unknown[]) => moderateUserAction(...a),
  decideApplicationAction: (...a: unknown[]) => decideApplicationAction(...a),
  decideCampaignAction: (...a: unknown[]) => decideCampaignAction(...a),
  releasePaymentAction: (...a: unknown[]) => releasePaymentAction(...a),
}));
vi.mock("@/features/admin/server", async (original) => {
  const real = await original<typeof import("@/features/admin/server")>();
  return { ...real, loadUsers: (...a: unknown[]) => s.loadUsers(...a), loadUser: (...a: unknown[]) => s.loadUser(...a), loadApplications: (...a: unknown[]) => s.loadApplications(...a), loadApplication: (...a: unknown[]) => s.loadApplication(...a), loadReviewCampaigns: (...a: unknown[]) => s.loadReviewCampaigns(...a), loadReviewCampaign: (...a: unknown[]) => s.loadReviewCampaign(...a), loadPayments: (...a: unknown[]) => s.loadPayments(...a), loadPayment: (...a: unknown[]) => s.loadPayment(...a), queueSize: (...a: unknown[]) => s.queueSize(...a) };
});

const { UsersPage } = await import("@/features/admin/users-page");
const { UserDetailPage } = await import("@/features/admin/user-detail-page");
const { ApplicationsPage } = await import("@/features/admin/applications-page");
const { ApplicationDetailPage } = await import("@/features/admin/application-detail-page");
const { CampaignsReviewPage } = await import("@/features/admin/campaigns-page");
const { CampaignDetailPage } = await import("@/features/admin/campaign-detail-page");
const { PaymentsAdminPage } = await import("@/features/admin/payments-page");
const { PaymentDetailPage } = await import("@/features/admin/payment-detail-page");
const { OverviewPage } = await import("@/features/admin/overview-page");

beforeEach(() => {
  for (const mock of [refresh, moderateUserAction, decideApplicationAction, decideCampaignAction, releasePaymentAction, ...Object.values(s)]) mock.mockReset();
});

const page = (items: unknown[], nextCursor: string | null = null) => ({ items, nextCursor });
const viewer = (...permissions: string[]) => ({ id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", permissions: permissions as never });

describe("lists", () => {
  it("users: shows each account with role and status, filters from the URL, and pages by cursor", async () => {
    s.loadUsers.mockResolvedValue(page([adminUserItem(), adminUserItem({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", fullName: "Amina", role: "creator", status: "pending", isFlagged: true })], "abc"));
    render(await UsersPage({ query: { role: "brand", sort: "created_at" } }));
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]!).getByRole("link", { name: "Kevin Brand" })).toHaveAttribute("href", `/admin/users/${TARGET_ID}`);
    expect(rows[1]).toHaveTextContent("Active");
    expect(rows[2]).toHaveTextContent("Flagged");
    expect(rows[2]).toHaveTextContent("Pending");
    expect(screen.getByRole("link", { name: "Brand" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Show more" })).toHaveAttribute("href", "/admin/users?role=brand&cursor=abc");
    expect(document.body.textContent).not.toMatch(/bulk|send message|invite|security alerts/i); // nothing the API cannot do
  });

  it("applications and campaigns: queue first, honest empty states", async () => {
    s.loadApplications.mockResolvedValue(page([adminApplicationItem()]));
    const { unmount } = render(await ApplicationsPage({ query: { status: "under_review" } }));
    expect(screen.getByRole("link", { name: "Amina Beauty" })).toHaveAttribute("href", `/admin/applications/${TARGET_ID}`);
    expect(screen.getByText("Under review", { selector: "span" })).toBeInTheDocument();
    unmount();
    s.loadApplications.mockResolvedValue(page([]));
    const second = render(await ApplicationsPage({ query: { status: "under_review" } }));
    expect(screen.getByText("No applications are waiting for review.")).toBeInTheDocument();
    second.unmount();
    s.loadReviewCampaigns.mockResolvedValue(page([adminCampaignItem()]));
    render(await CampaignsReviewPage({ query: { status: "pending_review" } }));
    expect(screen.getByRole("link", { name: "Summer Glow Launch" })).toHaveAttribute("href", `/admin/campaigns/${TARGET_ID}`);
    expect(screen.getByText(/Glow Cosmetics/)).toBeInTheDocument();
  });

  it("payments: amounts with the frozen fee and net, simulated and readiness labels", async () => {
    s.loadPayments.mockResolvedValue(page([adminPaymentDetail()]));
    render(await PaymentsAdminPage({ query: { releasable: true } }));
    const row = screen.getAllByRole("row")[1]!;
    expect(row).toHaveTextContent("INV-8");
    expect(row).toHaveTextContent("85,000 FCFA");
    expect(row).toHaveTextContent("17,000 FCFA / 68,000 FCFA");
    expect(row).toHaveTextContent("Simulated");
    expect(row).toHaveTextContent("Ready to release");
    expect(screen.getByRole("link", { name: "Ready to release" })).toHaveAttribute("aria-current", "page");
  });

  it("the overview shows only the queues this administrator may open, with real counts, and a dash when a count can't be read", async () => {
    s.queueSize.mockResolvedValueOnce({ count: 3, more: false }).mockResolvedValueOnce(null);
    render(await OverviewPage({ permissions: ["applications.review", "campaigns.review"] }));
    expect(screen.getByTestId("queue-applications.review")).toHaveTextContent("3");
    expect(screen.getByTestId("queue-campaigns.review")).toHaveTextContent("—");
    expect(screen.queryByTestId("queue-payments.release")).not.toBeInTheDocument();
    expect(screen.queryByTestId("queue-users.view")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/revenue|commission/i);
  });

  it("an administrator with no queue gets an honest message", async () => {
    render(await OverviewPage({ permissions: ["dashboard.view"] }));
    expect(screen.getByText(/no review queues/)).toBeInTheDocument();
  });
});

describe("user detail and account actions", () => {
  it("shows the account and the action its state allows; the reason box appears only after choosing an action", async () => {
    s.loadUser.mockResolvedValue(adminUserDetail());
    render(await UserDetailPage({ id: TARGET_ID, viewer: viewer("users.view", "users.moderate") }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Kevin Brand");
    expect(screen.getByRole("button", { name: "Suspend account" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reactivate account" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Reason/)).not.toBeInTheDocument();
    expect(screen.getByText(/Nothing is sent by e-mail or SMS/)).toBeInTheDocument();
  });

  it("without users.moderate there are no buttons, only the explanation; nobody can act on their own account", async () => {
    s.loadUser.mockResolvedValue(adminUserDetail());
    const { unmount } = render(await UserDetailPage({ id: TARGET_ID, viewer: viewer("users.view") }));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/can view accounts but not change them/)).toBeInTheDocument();
    unmount();
    s.loadUser.mockResolvedValue(adminUserDetail({ id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" }));
    render(await UserDetailPage({ id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", viewer: viewer("users.view", "users.moderate") }));
    expect(screen.queryByRole("button", { name: /Suspend/ })).not.toBeInTheDocument();
  });

  it("suspending asks first, sends the id, kind and reason, then refreshes and says what the API confirmed", async () => {
    s.loadUser.mockResolvedValue(adminUserDetail());
    moderateUserAction.mockResolvedValue({ ok: true, status: "suspended" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(await UserDetailPage({ id: TARGET_ID, viewer: viewer("users.view", "users.moderate") }));
    await user.click(screen.getByRole("button", { name: "Suspend account" }));
    await user.type(screen.getByLabelText(/Reason/), "Repeated complaints");
    await user.click(screen.getByRole("button", { name: /^Confirm: Suspend account/ }));
    await waitFor(() => expect(moderateUserAction).toHaveBeenCalledWith({ id: TARGET_ID, kind: "suspend", reason: "Repeated complaints" }));
    expect(await screen.findByRole("status")).toHaveTextContent("The account was suspended");
    expect(refresh).toHaveBeenCalled();
  });

  it("declining the confirmation sends nothing; an over-long or multi-line reason is stopped locally", async () => {
    s.loadUser.mockResolvedValue(adminUserDetail());
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(await UserDetailPage({ id: TARGET_ID, viewer: viewer("users.view", "users.moderate") }));
    await user.click(screen.getByRole("button", { name: "Suspend account" }));
    await user.click(screen.getByRole("button", { name: /^Confirm: Suspend account/ }));
    expect(confirm).toHaveBeenCalled();
    expect(moderateUserAction).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText(/Reason/), "a{enter}b");
    await user.click(screen.getByRole("button", { name: /^Confirm: Suspend account/ }));
    expect(await screen.findByText("Use a single line.")).toBeInTheDocument();
    expect(moderateUserAction).not.toHaveBeenCalled();
  });

  it("a refused change (last Super Admin) is explained, nothing is claimed, and the page refreshes to the real state", async () => {
    s.loadUser.mockResolvedValue(adminUserDetail({ role: "admin" }));
    moderateUserAction.mockResolvedValue({ ok: false, error: { kind: "conflict", code: "last_super_admin", message: "The last active Super Admin can't be suspended." } });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(await UserDetailPage({ id: TARGET_ID, viewer: viewer("users.view", "users.moderate", "team.manage") }));
    await user.click(screen.getByRole("button", { name: "Suspend account" }));
    await user.click(screen.getByRole("button", { name: /^Confirm: Suspend account/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/last active Super Admin.*Nothing was changed/);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("an ended session offers sign-in with a way back; a network failure is retryable; a double click sends one request", async () => {
    s.loadUser.mockResolvedValue(adminUserDetail({ status: "suspended" }));
    let finish: (value: unknown) => void = () => undefined;
    moderateUserAction.mockResolvedValueOnce({ ok: false, error: { kind: "unauthenticated" } }).mockRejectedValueOnce(new Error("network")).mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(await UserDetailPage({ id: TARGET_ID, viewer: viewer("users.view", "users.moderate") }));
    const confirmNow = async () => {
      await user.click(screen.getByRole("button", { name: "Reactivate account" }));
      await user.click(screen.getByRole("button", { name: /^Confirm: Reactivate account/ }));
    };
    await confirmNow();
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("link", { name: "Sign in again" })).toHaveAttribute("href", `/sign-in?next=${encodeURIComponent(`/admin/users/${TARGET_ID}`)}&expired=1`);
    await user.click(screen.getByRole("button", { name: /^Confirm: Reactivate account/ }));
    await waitFor(() => expect(moderateUserAction).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("alert")).toHaveTextContent(/may or may not have been made/);
    const button = screen.getByRole("button", { name: /^Confirm: Reactivate account/ });
    act(() => {
      button.click();
      button.click();
    });
    expect(moderateUserAction).toHaveBeenCalledTimes(3);
    finish({ ok: true, status: "active" });
  });
});

describe("application review", () => {
  it("shows the frozen application, the payout method as network and last digits only, and the decision buttons only while under review", async () => {
    s.loadApplication.mockResolvedValue(adminApplicationDetail());
    render(await ApplicationDetailPage({ id: TARGET_ID, viewer: viewer("applications.review") }));
    expect(screen.getByText(/Instagram @amina.beauty/)).toBeInTheDocument();
    expect(screen.getByText(/MTN MoMo · number ending 456/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/677\d{6}/);
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("a decided application and a viewer without the permission have no buttons", async () => {
    s.loadApplication.mockResolvedValue(adminApplicationDetail({ status: "approved" }));
    const { unmount } = render(await ApplicationDetailPage({ id: TARGET_ID, viewer: viewer("applications.review") }));
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.getByText("This application is not waiting for a decision.")).toBeInTheDocument();
    unmount();
    s.loadApplication.mockResolvedValue(adminApplicationDetail());
    render(await ApplicationDetailPage({ id: TARGET_ID, viewer: viewer("users.view") }));
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("rejecting needs a reason of at least 5 characters (stopped locally), then sends it as the applicant-facing reason", async () => {
    s.loadApplication.mockResolvedValue(adminApplicationDetail());
    decideApplicationAction.mockResolvedValue({ ok: true, status: "rejected" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(await ApplicationDetailPage({ id: TARGET_ID, viewer: viewer("applications.review") }));
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(screen.getByText(/The applicant reads this as feedback/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Reason for the applicant/), "no");
    await user.click(screen.getByRole("button", { name: /^Confirm: Reject/ }));
    expect(await screen.findByText("Write at least 5 characters.")).toBeInTheDocument();
    expect(decideApplicationAction).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText(/Reason for the applicant/));
    await user.type(screen.getByLabelText(/Reason for the applicant/), "Please add clearer samples.");
    await user.click(screen.getByRole("button", { name: /^Confirm: Reject/ }));
    await waitFor(() => expect(decideApplicationAction).toHaveBeenCalledWith({ id: TARGET_ID, kind: "reject", text: "Please add clearer samples." }));
    expect(await screen.findByRole("status")).toHaveTextContent("The application was rejected");
  });

  it("approving with no note sends no text", async () => {
    s.loadApplication.mockResolvedValue(adminApplicationDetail());
    decideApplicationAction.mockResolvedValue({ ok: true, status: "approved" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(await ApplicationDetailPage({ id: TARGET_ID, viewer: viewer("applications.review") }));
    await user.click(screen.getByRole("button", { name: "Approve" }));
    await user.click(screen.getByRole("button", { name: /^Confirm: Approve/ }));
    await waitFor(() => expect(decideApplicationAction).toHaveBeenCalledWith({ id: TARGET_ID, kind: "approve" }));
  });
});

describe("campaign review", () => {
  it("shows the brief and decision buttons while pending review; approving sends no text when no note is written", async () => {
    s.loadReviewCampaign.mockResolvedValue(adminCampaignDetail());
    decideCampaignAction.mockResolvedValue({ ok: true, status: "open" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(await CampaignDetailPage({ id: TARGET_ID, viewer: viewer("campaigns.review") }));
    expect(screen.getByText("1 reel and 3 stories")).toBeInTheDocument();
    expect(screen.getByText("3%+")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Approve and open" }));
    await user.click(screen.getByRole("button", { name: /^Confirm: Approve and open/ }));
    await waitFor(() => expect(decideCampaignAction).toHaveBeenCalledWith({ id: TARGET_ID, kind: "approve" }));
    expect(await screen.findByRole("status")).toHaveTextContent("approved and is open");
  });

  it("a campaign already decided shows the reviewer's note and no buttons", async () => {
    s.loadReviewCampaign.mockResolvedValue(adminCampaignDetail({ status: "rejected", reviewNote: "Budget is unclear." }));
    render(await CampaignDetailPage({ id: TARGET_ID, viewer: viewer("campaigns.review") }));
    expect(screen.getByText(/Budget is unclear\./)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("payment release", () => {
  it("shows the frozen amounts, the simulated label and the Release button only when the API says release is allowed AND the viewer holds payments.release", async () => {
    s.loadPayment.mockResolvedValue(adminPaymentDetail());
    const { unmount } = render(await PaymentDetailPage({ id: TARGET_ID, viewer: viewer("payments.view", "payments.release") }));
    expect(screen.getByText("Platform fee (20%)")).toBeInTheDocument();
    expect(screen.getAllByText("17,000 FCFA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("68,000 FCFA").length).toBeGreaterThan(0);
    expect(screen.getByText(/Simulated payment: a development test/)).toBeInTheDocument();
    expect(screen.getByText(/number ending 456/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Release payment" })).toBeInTheDocument();
    unmount();
    render(await PaymentDetailPage({ id: TARGET_ID, viewer: viewer("payments.view") }));
    expect(screen.queryByRole("button", { name: "Release payment" })).not.toBeInTheDocument();
    expect(screen.getByText("Your role can see payments but not release them.")).toBeInTheDocument();
  });

  it("explains why a payment can't be released yet instead of offering the button", async () => {
    s.loadPayment.mockResolvedValue(adminPaymentDetail({ status: "requested", actions: { canRelease: false }, delivery: { reportedAt: "2026-10-19T12:00:00.000Z", acknowledgedAt: null, disputeDeadline: "2026-10-26T12:00:00.000Z", disputeWindowOpen: true, releaseEligible: false } }));
    render(await PaymentDetailPage({ id: TARGET_ID, viewer: viewer("payments.view", "payments.release") }));
    expect(screen.queryByRole("button", { name: "Release payment" })).not.toBeInTheDocument();
    expect(screen.getByText(/the brand can still dispute the delivery/i)).toBeInTheDocument();
  });

  it("releasing asks first, then reports released only after the API confirmed; a refusal changes nothing on screen", async () => {
    s.loadPayment.mockResolvedValue(adminPaymentDetail());
    releasePaymentAction.mockResolvedValueOnce({ ok: false, error: { kind: "conflict", code: "payment_disputed", message: "This payment is held back by a dispute and can't be released." } }).mockResolvedValueOnce({ ok: true, status: "released" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(await PaymentDetailPage({ id: TARGET_ID, viewer: viewer("payments.view", "payments.release") }));
    await user.click(screen.getByRole("button", { name: "Release payment" }));
    await user.click(screen.getByRole("button", { name: /^Confirm: Release payment/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/held back by a dispute.*Nothing was changed/);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Confirm: Release payment/ }));
    await waitFor(() => expect(releasePaymentAction).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("status")).toHaveTextContent("The payment was released");
    expect(releasePaymentAction).toHaveBeenCalledWith({ id: TARGET_ID });
  });
});
