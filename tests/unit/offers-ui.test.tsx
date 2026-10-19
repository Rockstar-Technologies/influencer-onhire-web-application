// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OFFER_ID, brandOfferView, hireCreator, invitationView, offerView } from "../helpers";
import { RedirectSignal } from "../mocks/next";

const push = vi.fn();
const refresh = vi.fn();
const submitHireAction = vi.fn();
const answerOfferAction = vi.fn();
const decideOfferAction = vi.fn();
const loadCreatorInbox = vi.fn();
const loadBrandOffers = vi.fn();
const loadHireCreator = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/features/offers/actions", () => ({
  submitHireAction: (...a: unknown[]) => submitHireAction(...a),
  answerOfferAction: (...a: unknown[]) => answerOfferAction(...a),
  decideOfferAction: (...a: unknown[]) => decideOfferAction(...a),
}));
vi.mock("@/features/offers/server", async (original) => ({
  ...(await original<typeof import("@/features/offers/server")>()),
  loadCreatorInbox: (...a: unknown[]) => loadCreatorInbox(...a),
  loadBrandOffers: (...a: unknown[]) => loadBrandOffers(...a),
  loadHireCreator: (...a: unknown[]) => loadHireCreator(...a),
}));

const { HireForm } = await import("@/features/offers/hire/hire-form");
const { HirePage } = await import("@/features/offers/hire/hire-page");
const { BrandOfferActions } = await import("@/features/offers/brand/brand-offer-actions");
const { BrandOffersPage } = await import("@/features/offers/brand/brand-offers-page");
const { CampaignRequestsPage } = await import("@/features/creator/requests/campaign-requests-page");

const REASONS = [
  { id: 1, label: "Schedule conflict" },
  { id: 4, label: "Other" },
];
const inbox = (over: Partial<{ pending: unknown[]; history: unknown[]; next: string | null; truncated: boolean }> = {}) => ({
  pending: { items: over.pending ?? [], nextCursor: over.truncated ? "p" : null },
  history: { items: over.history ?? [], nextCursor: over.next ?? null },
  reasons: REASONS,
});

beforeEach(() => {
  for (const mock of [push, refresh, submitHireAction, answerOfferAction, decideOfferAction, loadCreatorInbox, loadBrandOffers, loadHireCreator]) mock.mockReset();
});

async function fillHire(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Your Full Name/), "Jane Brand");
  await user.type(screen.getByLabelText(/Location/), "Douala, Cameroon");
}

describe("hire form", () => {
  const creator = hireCreator();
  const render_ = () => render(<HireForm creator={creator} firstName="Kevin" header={<h1>Kevin Fitness</h1>} />);

  it("offers only what the API says: the creator's platforms with their rates, accepted payment methods, durations from the minimum booking", () => {
    render_();
    const platforms = [...(screen.getByLabelText(/Platform/) as HTMLSelectElement).options].map((o) => [o.value, o.textContent]);
    expect(platforms).toEqual([["tiktok", "TikTok · 30,000 FCFA"], ["instagram", "Instagram · 45,000 FCFA"]]);
    expect(screen.getByRole("radio", { name: "MTN MoMo" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Orange Money" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /bank/i })).not.toBeInTheDocument();
    expect([...(screen.getByLabelText(/Campaign Duration/) as HTMLSelectElement).options].map((o) => o.value)).toEqual(["1-week", "2-weeks", "1-month", "2-months", "3-months-plus"]);
    expect(screen.getByLabelText(/Campaign Duration/)).toHaveValue("1-month");
  });

  it("shows the price of the chosen platform and says it is fixed when sent; there is no price input", async () => {
    const user = userEvent.setup();
    render_();
    expect(screen.getByText(/current rate on TikTok/)).toHaveTextContent("30,000 FCFA");
    await user.selectOptions(screen.getByLabelText(/Platform/), "instagram");
    expect(screen.getByText(/current rate on Instagram/)).toHaveTextContent("45,000 FCFA");
    expect(screen.queryByLabelText(/price|amount/i)).not.toBeInTheDocument();
  });

  it("validates locally and sends nothing", async () => {
    const user = userEvent.setup();
    render_();
    await user.click(screen.getByRole("button", { name: "Submit Hire Request" }));
    expect(await screen.findByText("Enter your full name.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Nothing was sent");
    expect(submitHireAction).not.toHaveBeenCalled();
  });

  it("sends the typed values and shows the API's confirmation (reference, price, platform) only after it confirmed", async () => {
    submitHireAction.mockResolvedValue({ ok: true, offer: brandOfferView({ reference: "HR-77" }) });
    const user = userEvent.setup();
    render_();
    await fillHire(user);
    await user.click(screen.getByRole("button", { name: "Submit Hire Request" }));
    expect(await screen.findByRole("heading", { name: "Hire request sent" })).toBeInTheDocument();
    expect(submitHireAction).toHaveBeenCalledWith({ username: "kevin.fitness", values: expect.objectContaining({ fullName: "Jane Brand", location: "Douala, Cameroon", platform: "tiktok", paymentMethod: "mtn_momo", duration: "1-month" }) });
    expect(screen.getByText("HR-77")).toBeInTheDocument();
    expect(screen.getByText("30,000 FCFA")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See my hire requests" })).toHaveAttribute("href", "/brand/offers");
    expect(document.body.textContent).not.toMatch(/48 hours|agree on deliverables/i);
  });

  it("keeps what was typed and says nothing was sent when the API refuses", async () => {
    submitHireAction.mockResolvedValue({ ok: false, error: { kind: "validation", fields: { duration: "shorter than the minimum booking" }, message: null } });
    const user = userEvent.setup();
    render_();
    await fillHire(user);
    await user.click(screen.getByRole("button", { name: "Submit Hire Request" }));
    expect(await screen.findByText("shorter than the minimum booking")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Nothing was sent");
    expect(screen.getByLabelText(/Your Full Name/)).toHaveValue("Jane Brand");
  });

  it("a duplicate pending hire is explained with a link to the hire list", async () => {
    submitHireAction.mockResolvedValue({ ok: false, error: { kind: "conflict", code: "hire_already_pending", message: "You already have a pending request to this creator." } });
    const user = userEvent.setup();
    render_();
    await fillHire(user);
    await user.click(screen.getByRole("button", { name: "Submit Hire Request" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/already have a pending request/);
    expect(within(alert).getByRole("link", { name: "See my hire requests" })).toHaveAttribute("href", "/brand/offers");
  });

  it("an ended session keeps the form and links to sign-in with a way back", async () => {
    submitHireAction.mockResolvedValue({ ok: false, error: { kind: "unauthenticated" } });
    const user = userEvent.setup();
    render_();
    await fillHire(user);
    await user.click(screen.getByRole("button", { name: "Submit Hire Request" }));
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("link", { name: "Sign in again" })).toHaveAttribute("href", expect.stringContaining("/sign-in?next=%2Finfluencers%2Fkevin.fitness%2Fhire"));
    expect(screen.getByLabelText(/Your Full Name/)).toHaveValue("Jane Brand");
  });

  it("a network failure is retryable", async () => {
    submitHireAction.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ ok: true, offer: brandOfferView() });
    const user = userEvent.setup();
    render_();
    await fillHire(user);
    await user.click(screen.getByRole("button", { name: "Submit Hire Request" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nothing was changed");
    await user.click(screen.getByRole("button", { name: "Submit Hire Request" }));
    expect(await screen.findByRole("heading", { name: "Hire request sent" })).toBeInTheDocument();
    expect(submitHireAction).toHaveBeenCalledTimes(2);
  });

  it("two submits in the same instant send one request", async () => {
    let finish: (value: unknown) => void = () => undefined;
    submitHireAction.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    const { container } = render_();
    await fillHire(user);
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(submitHireAction).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("button", { name: "Sending request..." })).toBeDisabled();
    finish({ ok: true, offer: brandOfferView() });
    expect(await screen.findByRole("heading", { name: "Hire request sent" })).toBeInTheDocument();
  });

  it("the hire page loads the creator with the brand's session; an unknown creator is 'not found'", async () => {
    loadHireCreator.mockResolvedValue(creator);
    render(await HirePage({ username: "kevin.fitness" }));
    expect(loadHireCreator).toHaveBeenCalledWith("kevin.fitness", "/influencers/kevin.fitness/hire");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Kevin Fitness");
    expect(screen.getByText(/Min. booking 1 week/)).toBeInTheDocument();
    loadHireCreator.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    await expect(HirePage({ username: "nobody.here" })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("creator inbox", () => {
  it("lists hires and invitations waiting for an answer, each with its real details, and history with the real statuses", async () => {
    loadCreatorInbox.mockResolvedValue(inbox({ pending: [offerView(), invitationView()], history: [offerView({ id: "66666666-6666-4666-8666-666666666666", reference: "HR-3", status: "expired" }), offerView({ id: "77777777-7777-4777-8777-777777777777", reference: "HR-4", status: "cancelled" })] }));
    render(await CampaignRequestsPage({ query: "" }));
    expect(screen.getByRole("article", { name: "Direct hire HR-12" })).toHaveTextContent("Acme Foods wants to hire you");
    expect(screen.getByRole("article", { name: "Direct hire HR-12" })).toHaveTextContent("30,000 FCFA");
    expect(screen.getByRole("article", { name: "Direct hire HR-12" })).toHaveTextContent("Marketing Team");
    const invitation = screen.getByRole("article", { name: "Platform invitation HR-13" });
    expect(invitation).toHaveTextContent("Summer Glow Launch");
    expect(invitation).toHaveTextContent(/invited you/);
    expect(within(invitation).queryByLabelText(/Start date/)).not.toBeInTheDocument(); // an invitation's dates are the campaign's
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Expired");
    expect(rows[2]).toHaveTextContent("Cancelled");
    expect(document.body.textContent).not.toMatch(/Why you matched|polite auto-message|active campaigns/i);
  });

  it("shows an honest empty state", async () => {
    loadCreatorInbox.mockResolvedValue(inbox());
    render(await CampaignRequestsPage({ query: "" }));
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
    expect(screen.getByText("No past requests yet.")).toBeInTheDocument();
  });

  it("pages the history by cursor and filters by search text", async () => {
    loadCreatorInbox.mockResolvedValue(inbox({ pending: [offerView()], history: [offerView({ id: "66666666-6666-4666-8666-666666666666", reference: "HR-3", status: "declined", brandName: "Other Co" })], next: "abc" }));
    const { unmount } = render(await CampaignRequestsPage({ query: "" }));
    expect(screen.getByRole("link", { name: "Show more history" })).toHaveAttribute("href", "/creator/requests?cursor=abc");
    unmount();
    render(await CampaignRequestsPage({ query: "other co" }));
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Other Co");
  });

  it("accepting a hire sends the chosen start date, then refreshes to show what the API holds", async () => {
    loadCreatorInbox.mockResolvedValue(inbox({ pending: [offerView()] }));
    answerOfferAction.mockResolvedValue({ ok: true, offer: offerView({ status: "accepted" }) });
    const user = userEvent.setup();
    render(await CampaignRequestsPage({ query: "" }));
    const soon = new Date(Date.now() + 30 * 86_400_000);
    const start = `${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, "0")}-${String(soon.getDate()).padStart(2, "0")}`;
    fireEvent.change(screen.getByLabelText(/Start date/), { target: { value: start } });
    await user.click(screen.getByRole("button", { name: "Accept Request" }));
    await waitFor(() => expect(answerOfferAction).toHaveBeenCalledWith({ id: OFFER_ID, kind: "accept", startDate: start }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.getByRole("status")).toHaveTextContent("Accepted HR-12");
  });

  it("a start date in the past blocks accepting and sends nothing", async () => {
    loadCreatorInbox.mockResolvedValue(inbox({ pending: [offerView()] }));
    render(await CampaignRequestsPage({ query: "" }));
    fireEvent.change(screen.getByLabelText(/Start date/), { target: { value: "2020-01-01" } });
    expect(await screen.findByText("The start date can't be in the past.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept Request" })).toBeDisabled();
    expect(answerOfferAction).not.toHaveBeenCalled();
  });

  it("accepting an invitation sends no date", async () => {
    loadCreatorInbox.mockResolvedValue(inbox({ pending: [invitationView()] }));
    answerOfferAction.mockResolvedValue({ ok: true, offer: invitationView({ status: "accepted" }) });
    const user = userEvent.setup();
    render(await CampaignRequestsPage({ query: "" }));
    await user.click(screen.getByRole("button", { name: "Accept Campaign" }));
    await waitFor(() => expect(answerOfferAction).toHaveBeenCalledWith({ id: "55555555-5555-4555-8555-555555555555", kind: "accept", startDate: null }));
  });

  it("declining needs one of the API's reasons and sends its id", async () => {
    loadCreatorInbox.mockResolvedValue(inbox({ pending: [offerView()] }));
    answerOfferAction.mockResolvedValue({ ok: true, offer: offerView({ status: "declined" }) });
    const user = userEvent.setup();
    render(await CampaignRequestsPage({ query: "" }));
    await user.click(screen.getByRole("button", { name: "Decline" }));
    expect(screen.getByRole("button", { name: "Confirm Decline" })).toBeDisabled();
    expect([...(screen.getByLabelText(/Why are you declining/) as HTMLSelectElement).options].map((o) => o.textContent)).toEqual(["Choose a reason", "Schedule conflict", "Other"]);
    await user.selectOptions(screen.getByLabelText(/Why are you declining/), "4");
    await user.click(screen.getByRole("button", { name: "Confirm Decline" }));
    await waitFor(() => expect(answerOfferAction).toHaveBeenCalledWith({ id: OFFER_ID, kind: "decline", reasonId: 4 }));
  });

  it("a refused acceptance (capacity) is explained on that request and the page is refreshed to the real state", async () => {
    loadCreatorInbox.mockResolvedValue(inbox({ pending: [offerView()] }));
    answerOfferAction.mockResolvedValue({ ok: false, error: { kind: "conflict", code: "creator_capacity_exceeded", message: "You already have the maximum number of overlapping engagements for these dates." } });
    const user = userEvent.setup();
    render(await CampaignRequestsPage({ query: "" }));
    await user.click(screen.getByRole("button", { name: "Accept Request" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/maximum number of overlapping engagements/);
    expect(screen.getByRole("alert")).toHaveTextContent("Nothing was changed");
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("an ended session offers sign-in and does not claim success", async () => {
    loadCreatorInbox.mockResolvedValue(inbox({ pending: [offerView()] }));
    answerOfferAction.mockResolvedValue({ ok: false, error: { kind: "unauthenticated" } });
    const user = userEvent.setup();
    render(await CampaignRequestsPage({ query: "" }));
    await user.click(screen.getByRole("button", { name: "Accept Request" }));
    expect(within(await screen.findByRole("alert")).getByRole("link", { name: "Sign in again" })).toHaveAttribute("href", expect.stringContaining("/sign-in?next=%2Fcreator%2Frequests"));
  });

  it("a network failure is retryable and double clicks send one answer", async () => {
    loadCreatorInbox.mockResolvedValue(inbox({ pending: [offerView()] }));
    let finish: (value: unknown) => void = () => undefined;
    answerOfferAction.mockRejectedValueOnce(new Error("network")).mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(await CampaignRequestsPage({ query: "" }));
    await user.click(screen.getByRole("button", { name: "Accept Request" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nothing was changed");
    await user.dblClick(screen.getByRole("button", { name: "Accept Request" }));
    expect(answerOfferAction).toHaveBeenCalledTimes(2);
    finish({ ok: true, offer: offerView({ status: "accepted" }) });
  });

  it("a creator's own pending application can't be answered here", async () => {
    loadCreatorInbox.mockResolvedValue(inbox({ pending: [invitationView({ initiator: "creator", pitch: "I would be great for this." })] }));
    render(await CampaignRequestsPage({ query: "" }));
    expect(screen.getByText("Waiting for the brand")).toBeInTheDocument();
    expect(screen.getByText(/I would be great for this/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Accept|Decline/ })).not.toBeInTheDocument();
  });
});

describe("brand hires list and actions", () => {
  const list = (items: unknown[], over: Record<string, unknown> = {}) => ({ items, nextCursor: null, status: null, ...over });

  it("lists the brand's hires with creator facts, real statuses and what is permitted", async () => {
    loadBrandOffers.mockResolvedValue(list([brandOfferView(), brandOfferView({ id: "66666666-6666-4666-8666-666666666666", reference: "HR-3", status: "accepted", fundingDeadline: "2031-01-08T10:00:00.000Z", window: { startDate: "2031-01-01", endDate: "2031-01-07" } })]));
    render(await BrandOffersPage({}));
    const cards = screen.getAllByRole("listitem");
    expect(cards[0]).toHaveTextContent("Kevin Fitness");
    expect(cards[0]).toHaveTextContent("Pending");
    expect(within(cards[0]!).getByRole("button", { name: "Cancel request" })).toBeInTheDocument();
    expect(cards[1]).toHaveTextContent("Accepted");
    expect(cards[1]).toHaveTextContent("Fund by");
    expect(within(cards[1]!).queryByRole("button")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/@gmail|phone|email/i);
  });

  it("filters by a real status, with an empty state, and pages by cursor", async () => {
    loadBrandOffers.mockResolvedValue(list([], { status: "declined" }));
    const { unmount } = render(await BrandOffersPage({ status: "declined" }));
    expect(screen.getByText("No requests with this status.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Declined" })).toHaveAttribute("aria-current", "page");
    expect(loadBrandOffers).toHaveBeenCalledWith({ status: "declined" });
    unmount();
    loadBrandOffers.mockResolvedValue(list([brandOfferView()], { nextCursor: "abc" }));
    render(await BrandOffersPage({}));
    expect(screen.getByRole("link", { name: "Show more" })).toHaveAttribute("href", "/brand/offers?cursor=abc");
  });

  const actions = (status: Parameters<typeof BrandOfferActions>[0]["status"], kind: Parameters<typeof BrandOfferActions>[0]["kind"]) => {
    const { unmount } = render(<BrandOfferActions id={OFFER_ID} status={status} kind={kind} />);
    const names = screen.queryAllByRole("button").map((b) => b.textContent);
    unmount();
    return names;
  };

  it("buttons follow what the API permits", () => {
    expect(actions("pending", "direct_hire")).toEqual(["Cancel request"]);
    expect(actions("pending", "application")).toEqual(["Accept application", "Decline"]);
    expect(actions("pending", "invitation")).toEqual([]); // invitations are answered by the creator
    for (const status of ["accepted", "declined", "withdrawn", "cancelled", "expired", "funding_expired", "refunded"] as const) {
      expect(actions(status, "direct_hire"), status).toEqual([]);
      expect(actions(status, "application"), status).toEqual([]);
    }
  });

  it("cancelling asks first, then refreshes; declining the question does nothing", async () => {
    decideOfferAction.mockResolvedValue({ ok: true, offer: brandOfferView({ status: "cancelled" }) });
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    const user = userEvent.setup();
    render(<BrandOfferActions id={OFFER_ID} status="pending" kind="direct_hire" />);
    await user.click(screen.getByRole("button", { name: "Cancel request" }));
    expect(decideOfferAction).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancel request" }));
    await waitFor(() => expect(decideOfferAction).toHaveBeenCalledWith({ id: OFFER_ID, kind: "cancel" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    confirm.mockRestore();
  });

  it("a refused decision is explained, nothing is claimed, and the page refreshes to the real state", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    decideOfferAction.mockResolvedValue({ ok: false, error: { kind: "conflict", code: "creator_not_active", message: "The creator's account is not active, so this can't be accepted right now." } });
    const user = userEvent.setup();
    render(<BrandOfferActions id={OFFER_ID} status="pending" kind="application" />);
    await user.click(screen.getByRole("button", { name: "Accept application" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/not active/);
    expect(refresh).toHaveBeenCalled();
  });

  it("a double click sends one request", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    let finish: (value: unknown) => void = () => undefined;
    decideOfferAction.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(<BrandOfferActions id={OFFER_ID} status="pending" kind="direct_hire" />);
    await user.dblClick(screen.getByRole("button", { name: "Cancel request" }));
    expect(decideOfferAction).toHaveBeenCalledTimes(1);
    finish({ ok: true, offer: brandOfferView({ status: "cancelled" }) });
  });
});
