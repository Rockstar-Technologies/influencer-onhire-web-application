// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OFFER_ID, brandOfferView, brandPayment, fundedView, fundingView } from "../helpers";
import { RedirectSignal } from "../mocks/next";

const startFundingAction = vi.fn();
const refreshFundingAction = vi.fn();
const loadFundable = vi.fn();
const loadFundingStates = vi.fn();
const loadBrandPayments = vi.fn();
const loadBrandOffers = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/features/payments/server", () => ({ loadBrandRefundRequests: vi.fn(async () => []) }));
vi.mock("@/features/payments/actions", () => ({ decideDeliveryAction: vi.fn(), requestRefundReviewAction: vi.fn(), withdrawRefundReviewAction: vi.fn() }));
vi.mock("@/features/funding/actions", () => ({
  startFundingAction: (...a: unknown[]) => startFundingAction(...a),
  refreshFundingAction: (...a: unknown[]) => refreshFundingAction(...a),
}));
vi.mock("@/features/funding/server", async (original) => ({
  ...(await original<typeof import("@/features/funding/server")>()),
  loadFundable: (...a: unknown[]) => loadFundable(...a),
  loadFundingStates: (...a: unknown[]) => loadFundingStates(...a),
  loadBrandPayments: (...a: unknown[]) => loadBrandPayments(...a),
}));
vi.mock("@/features/offers/server", async (original) => ({
  ...(await original<typeof import("@/features/offers/server")>()),
  loadBrandOffers: (...a: unknown[]) => loadBrandOffers(...a),
}));
vi.mock("@/features/offers/actions", () => ({ decideOfferAction: vi.fn() }));

const { FundPanel } = await import("@/features/funding/fund-panel");
const { FundPage } = await import("@/features/funding/fund-page");
const { BrandPaymentsPage } = await import("@/features/account/brand-payments/brand-payments-page");
const { BrandOffersPage } = await import("@/features/offers/brand/brand-offers-page");

beforeEach(() => {
  for (const mock of [startFundingAction, refreshFundingAction, loadFundable, loadFundingStates, loadBrandPayments, loadBrandOffers]) mock.mockReset();
});

const panel = (initial = fundingView(), preferred: string | null = "orange_money") => render(<FundPanel offerId={OFFER_ID} initial={initial} preferredMethod={preferred} />);
async function pay(user: ReturnType<typeof userEvent.setup>, phone = "677 123 456") {
  await user.type(screen.getByLabelText(/The number you're paying from/), phone);
  await user.click(screen.getByRole("button", { name: /^Pay / }));
}

describe("pay panel", () => {
  it("shows the API's amount (not editable), the deadline, and starts from the method the hire used", () => {
    panel();
    expect(screen.getByTestId("fund-amount")).toHaveTextContent("250,000 FCFA");
    expect(screen.queryByLabelText(/amount/i)).not.toBeInTheDocument();
    expect(document.querySelector('input[name="amount"], input[type="number"]')).toBeNull();
    expect(screen.getByRole("radio", { name: "Orange Money" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Pay 250,000 FCFA" })).toBeInTheDocument();
    expect(screen.queryByText(/fee|net|80%|20%/i)).not.toBeInTheDocument(); // a brand never sees the fee or the creator's share
  });

  it("offers exactly the API's payment methods", () => {
    panel();
    expect(screen.getAllByRole("radio").map((r) => (r as HTMLInputElement).value)).toEqual(["mtn_momo", "orange_money"]);
  });

  it("validates locally and sends nothing", async () => {
    const user = userEvent.setup();
    panel();
    await user.type(screen.getByLabelText(/The number you're paying from/), "123");
    await user.click(screen.getByRole("button", { name: /^Pay / }));
    expect(await screen.findByText(/Enter the 9-digit number/)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Nothing was sent and nothing was charged");
    expect(startFundingAction).not.toHaveBeenCalled();
  });

  it("sends the offer, a key, the method and the typed number — and no amount", async () => {
    startFundingAction.mockResolvedValue({ ok: true, replayed: false, funding: fundedView() });
    const user = userEvent.setup();
    panel();
    await pay(user);
    await waitFor(() => expect(startFundingAction).toHaveBeenCalledTimes(1));
    const sent = startFundingAction.mock.calls[0]![0];
    expect(sent).toEqual({ offerId: OFFER_ID, key: expect.stringMatching(/^fund-[0-9a-f-]{36}$/), paymentMethod: "orange_money", payerPhone: "677 123 456" });
    expect(sent).not.toHaveProperty("amountXaf");
  });

  it("shows 'paid' only after the API returned funded, and labels simulated money", async () => {
    startFundingAction.mockResolvedValue({ ok: true, replayed: false, funding: fundedView() });
    const user = userEvent.setup();
    panel();
    await pay(user);
    expect(await screen.findByTestId("fund-status")).toHaveTextContent("Paid and held in escrow");
    expect(screen.getByTestId("simulated-note")).toHaveTextContent(/No real money moved/);
    expect(screen.queryByRole("button", { name: /^Pay / })).not.toBeInTheDocument();
    expect(screen.getByText(/Confirmed · simulated/)).toBeInTheDocument();
  });

  it("a pending payment is shown as waiting (not paid), with 'Check status'", async () => {
    startFundingAction.mockResolvedValue({ ok: true, replayed: false, funding: fundingView({ status: "awaiting_confirmation", canStart: false, attempts: [{ id: "99999999-9999-4999-8999-999999999999", status: "pending", confirmation: "awaiting_confirmation", failure: null, startedAt: "2031-01-01T10:00:00.000Z", completedAt: null, simulated: false }] }) });
    const user = userEvent.setup();
    panel();
    await pay(user);
    expect(await screen.findByTestId("fund-status")).toHaveTextContent("Waiting for confirmation");
    expect(screen.getByRole("status")).toHaveTextContent(/Nothing is paid until the payment provider confirms/);
    expect(document.body.textContent).not.toMatch(/Paid and held/);
    expect(screen.queryByRole("button", { name: /^Pay / })).not.toBeInTheDocument(); // no second attempt while one is pending
    expect(screen.getByRole("button", { name: "Check status" })).toBeInTheDocument();
  });

  it("'Check status' reads the API's state and shows paid when (and only when) it says so", async () => {
    refreshFundingAction.mockResolvedValueOnce({ ok: true, funding: fundingView({ status: "awaiting_confirmation", canStart: false }) }).mockResolvedValueOnce({ ok: true, funding: fundedView() });
    const user = userEvent.setup();
    panel(fundingView({ status: "awaiting_confirmation", canStart: false }));
    await user.click(screen.getByRole("button", { name: "Check status" }));
    await waitFor(() => expect(refreshFundingAction).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("fund-status")).toHaveTextContent("Waiting for confirmation");
    await user.click(screen.getByRole("button", { name: "Check status" }));
    expect(await screen.findByText("Paid and held in escrow", { selector: "[data-testid=fund-status]" })).toBeInTheDocument();
    expect(refreshFundingAction).toHaveBeenCalledWith({ offerId: OFFER_ID });
  });

  it("an unclear status blocks a second payment and explains why", () => {
    panel(fundingView({ status: "indeterminate", canStart: false }));
    expect(screen.getByRole("status")).toHaveTextContent(/can't start a second one/);
    expect(screen.queryByRole("button", { name: /^Pay / })).not.toBeInTheDocument();
  });

  it("a failed attempt says nothing was taken and offers a new attempt with a NEW key", async () => {
    startFundingAction.mockResolvedValueOnce({ ok: true, replayed: false, funding: fundingView({ status: "failed", canStart: true, attempts: [{ id: "99999999-9999-4999-8999-999999999999", status: "failed", confirmation: "failed", failure: { category: "rejected" }, startedAt: "2031-01-01T10:00:00.000Z", completedAt: "2031-01-01T10:00:01.000Z", simulated: false }] }) }).mockResolvedValueOnce({ ok: true, replayed: false, funding: fundedView() });
    const user = userEvent.setup();
    panel();
    await pay(user);
    expect(await screen.findByTestId("fund-status")).toHaveTextContent("Payment not completed");
    expect(screen.getByRole("status")).toHaveTextContent(/nothing was taken/);
    expect(screen.getByText(/The provider declined the payment/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Pay / }));
    await waitFor(() => expect(startFundingAction).toHaveBeenCalledTimes(2));
    expect(startFundingAction.mock.calls[1]![0].key).not.toBe(startFundingAction.mock.calls[0]![0].key);
  });

  it("a lost answer keeps the SAME key, so the retry is safe, and the text does not claim nothing was charged", async () => {
    startFundingAction.mockResolvedValueOnce({ ok: false, error: { kind: "unavailable", requestId: "req-1" } }).mockResolvedValueOnce({ ok: true, replayed: true, funding: fundedView() });
    const user = userEvent.setup();
    panel();
    await pay(user);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/may or may not have been received/);
    expect(alert).not.toHaveTextContent(/nothing was charged/i);
    await user.click(screen.getByRole("button", { name: /^Pay / }));
    await waitFor(() => expect(startFundingAction).toHaveBeenCalledTimes(2));
    expect(startFundingAction.mock.calls[1]![0].key).toBe(startFundingAction.mock.calls[0]![0].key);
    expect(await screen.findByText(/already been received, so nothing was sent twice/)).toBeInTheDocument();
  });

  it("a thrown network error also keeps the key", async () => {
    startFundingAction.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ ok: true, replayed: false, funding: fundedView() });
    const user = userEvent.setup();
    panel();
    await pay(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Check status/);
    await user.click(screen.getByRole("button", { name: /^Pay / }));
    await waitFor(() => expect(startFundingAction).toHaveBeenCalledTimes(2));
    expect(startFundingAction.mock.calls[1]![0].key).toBe(startFundingAction.mock.calls[0]![0].key);
  });

  it("two clicks in the same instant send one request", async () => {
    startFundingAction.mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();
    const { container } = panel();
    await user.type(screen.getByLabelText(/The number you're paying from/), "677123456");
    const form = container.querySelector("form")!;
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(startFundingAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Sending payment request..." })).toBeDisabled();
  });

  it("an ended session explains that the request may have been sent, with a way back", async () => {
    startFundingAction.mockResolvedValue({ ok: false, error: { kind: "unauthenticated" } });
    const user = userEvent.setup();
    panel();
    await pay(user);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/check its status/);
    expect(within(alert).getByRole("link", { name: "Sign in again" })).toHaveAttribute("href", `/sign-in?next=${encodeURIComponent(`/brand/offers/${OFFER_ID}/fund`)}&expired=1`);
    expect(screen.getByLabelText(/The number you're paying from/)).toHaveValue("677 123 456");
  });

  it("no provider configured is stated plainly, and nothing is shown as paid", async () => {
    startFundingAction.mockResolvedValue({ ok: false, error: { kind: "payments_unavailable" } });
    const user = userEvent.setup();
    panel();
    await pay(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Payments are not available right now\. Nothing was charged/);
    expect(screen.getByTestId("fund-status")).toHaveTextContent("Not paid yet");
  });

  it("a lapsed booking and a paid booking offer no payment form", () => {
    const { unmount } = panel(fundingView({ status: "expired", canStart: false }));
    expect(screen.getByTestId("fund-status")).toHaveTextContent("Payment window ended");
    expect(screen.queryByRole("button", { name: /^Pay / })).not.toBeInTheDocument();
    unmount();
    panel(fundedView({ simulated: false }));
    expect(screen.queryByRole("button", { name: /^Pay / })).not.toBeInTheDocument();
    expect(screen.queryByTestId("simulated-note")).not.toBeInTheDocument();
  });
});

describe("pay page and lists", () => {
  it("the pay page is built from the API's offer and funding", async () => {
    loadFundable.mockResolvedValue({ offer: brandOfferView({ status: "accepted" }), funding: fundingView() });
    render(await FundPage({ offerId: OFFER_ID }));
    expect(loadFundable).toHaveBeenCalledWith(OFFER_ID);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Pay for this booking");
    expect(screen.getByText(/Kevin Fitness/)).toBeInTheDocument();
    expect(screen.getByTestId("fund-amount")).toHaveTextContent("250,000 FCFA");
  });

  it("the pay page of someone else's offer is 'not found'", async () => {
    loadFundable.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    await expect(FundPage({ offerId: OFFER_ID })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("the payments page lists the brand's real payments with status and the simulated label, and never a fee", async () => {
    loadBrandPayments.mockResolvedValue({ items: [brandPayment(), brandPayment({ id: "77777777-7777-4777-8777-777777777777", reference: "INV-6", simulated: false, status: "released", engagement: { offerId: OFFER_ID, origin: "campaign_match", campaign: { id: "33333333-3333-4333-8333-333333333333", reference: "CMP-7", title: "Summer Glow Launch" } } })], nextCursor: "abc" });
    render(await BrandPaymentsPage({}));
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Direct hire");
    expect(rows[1]).toHaveTextContent("INV-5");
    expect(rows[1]).toHaveTextContent("250,000 FCFA");
    expect(rows[1]).toHaveTextContent("Simulated");
    expect(rows[2]).toHaveTextContent("Summer Glow Launch");
    expect(rows[2]).not.toHaveTextContent("Simulated");
    expect(screen.getByRole("link", { name: "Show more" })).toHaveAttribute("href", "/brand/payments?cursor=abc");
    expect(document.body.textContent).not.toMatch(/Total deposited|platform fee|80%|20%|within 24 hours|are free/i);
  });

  it("the payments page has an honest empty state pointing at My hires", async () => {
    loadBrandPayments.mockResolvedValue({ items: [], nextCursor: null });
    render(await BrandPaymentsPage({}));
    expect(screen.getByText(/No payments yet/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /My hires|Pay for an accepted booking/ }).length).toBeGreaterThan(0);
  });

  it("an accepted booking in My hires shows where its payment stands and links to the pay page", async () => {
    loadBrandOffers.mockResolvedValue({ items: [brandOfferView({ status: "accepted", fundingDeadline: "2031-01-08T10:00:00.000Z" }), brandOfferView({ id: "66666666-6666-4666-8666-666666666666", reference: "HR-3", status: "pending" })], nextCursor: null, status: null });
    loadFundingStates.mockResolvedValue(new Map([[OFFER_ID, fundedView()]]));
    render(await BrandOffersPage({}));
    expect(loadFundingStates).toHaveBeenCalledWith([OFFER_ID]);
    const cards = screen.getAllByRole("listitem");
    expect(within(cards[0]!).getByTestId("funding-state")).toHaveTextContent("Paid and held in escrow");
    expect(within(cards[0]!).getByText("Simulated")).toBeInTheDocument();
    expect(within(cards[0]!).getByRole("link", { name: "View payment" })).toHaveAttribute("href", `/brand/offers/${OFFER_ID}/fund`);
    expect(within(cards[1]!).queryByTestId("funding-state")).not.toBeInTheDocument(); // only accepted bookings are paid
  });

  it("when a state can't be read the card still offers to pay, with no invented badge", async () => {
    loadBrandOffers.mockResolvedValue({ items: [brandOfferView({ status: "accepted" })], nextCursor: null, status: null });
    loadFundingStates.mockResolvedValue(new Map());
    render(await BrandOffersPage({}));
    expect(screen.getByTestId("funding-state")).toHaveTextContent("Payment");
    expect(screen.getByRole("link", { name: "Pay for this booking" })).toHaveAttribute("href", `/brand/offers/${OFFER_ID}/fund`);
  });
});
