// @vitest-environment jsdom
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CAMPAIGN_ID, OFFER_ID, creatorCampaign, invitationView, offerView } from "../helpers";
import { RedirectSignal } from "../mocks/next";

const refresh = vi.fn();
const applyToCampaignAction = vi.fn();
const withdrawApplicationAction = vi.fn();
const loadCampaigns = vi.fn();
const loadFilters = vi.fn();
const loadCampaign = vi.fn();
const loadMyPlatforms = vi.fn();
const loadMyOffer = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh }),
  usePathname: () => "/creator/campaigns",
  useSearchParams: () => new URLSearchParams(),
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/features/creator/campaigns/actions", () => ({
  applyToCampaignAction: (...a: unknown[]) => applyToCampaignAction(...a),
  withdrawApplicationAction: (...a: unknown[]) => withdrawApplicationAction(...a),
}));
vi.mock("@/features/creator/campaigns/server", async (original) => ({
  ...(await original<typeof import("@/features/creator/campaigns/server")>()),
  loadCampaigns: (...a: unknown[]) => loadCampaigns(...a),
  loadFilters: (...a: unknown[]) => loadFilters(...a),
  loadCampaign: (...a: unknown[]) => loadCampaign(...a),
  loadMyPlatforms: (...a: unknown[]) => loadMyPlatforms(...a),
  loadMyOffer: (...a: unknown[]) => loadMyOffer(...a),
}));

const { CampaignsBrowsePage } = await import("@/features/creator/campaigns/campaigns-page");
const { CampaignDetailPage } = await import("@/features/creator/campaigns/campaign-detail-page");
const { WithdrawButton } = await import("@/features/creator/campaigns/withdraw-button");
const { parseCampaignQuery } = await import("@/features/creator/campaigns/query");

const PLATFORMS = [
  { platform: "instagram", name: "Instagram", handle: "@amina", followers: 25_000, priceXaf: 85_000 },
  { platform: "tiktok", name: "TikTok", handle: "@amina_t", followers: 10_000, priceXaf: 300_000 },
];
const FILTERS = { niches: [{ slug: "beauty", name: "Beauty" }], cities: [{ slug: "douala", name: "Douala" }], interests: [], ageRanges: [] };
const query = parseCampaignQuery({});

beforeEach(() => {
  for (const mock of [refresh, applyToCampaignAction, withdrawApplicationAction, loadCampaigns, loadFilters, loadCampaign, loadMyPlatforms, loadMyOffer]) mock.mockReset();
  loadFilters.mockResolvedValue(FILTERS);
  loadMyPlatforms.mockResolvedValue(PLATFORMS);
});

describe("browse page", () => {
  it("lists real campaigns with the maximum per creator, dates and the creator's own application state", async () => {
    loadCampaigns.mockResolvedValue({ items: [creatorCampaign(), creatorCampaign({ id: "55555555-5555-4555-8555-555555555555", title: "Locked", eligibility: { meetsMinEngagement: false, canApply: false }, minEngagement: { pct: 5, label: "5%+" } }), creatorCampaign({ id: "66666666-6666-4666-8666-666666666666", title: "Applied", myOffer: { id: OFFER_ID, status: "pending" } })], nextCursor: "n1" });
    render(await CampaignsBrowsePage({ query }));
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]!).getByRole("link", { name: "Summer Glow Launch" })).toHaveAttribute("href", `/creator/campaigns/${CAMPAIGN_ID}`);
    expect(items[0]).toHaveTextContent("Maximum per creator");
    expect(items[0]).toHaveTextContent("200,000 FCFA");
    expect(within(items[0]!).getByRole("link", { name: "View and apply" })).toBeInTheDocument();
    expect(items[1]).toHaveTextContent("Not eligible");
    expect(items[2]).toHaveTextContent("Pending");
    expect(within(items[2]!).getByRole("link", { name: "View my application" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Show more" })).toHaveAttribute("href", "/creator/campaigns?cursor=n1");
  });

  it("filters come from the API and keep the other choices; an empty result is honest", async () => {
    loadCampaigns.mockResolvedValue({ items: [], nextCursor: null });
    render(await CampaignsBrowsePage({ query: parseCampaignQuery({ niche: "beauty", sort: "budget" }) }));
    expect(screen.getByRole("link", { name: "Beauty" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Douala" })).toHaveAttribute("href", "/creator/campaigns?sort=budget&niche=beauty&city=douala");
    expect(screen.getByRole("link", { name: "Highest budget" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText(/No open campaigns match/)).toBeInTheDocument();
  });

  it("a failure reaches the error page instead of an empty list", async () => {
    loadCampaigns.mockRejectedValue(new Error("down"));
    await expect(CampaignsBrowsePage({ query })).rejects.toThrow("down");
  });
});

describe("campaign detail and applying", () => {
  const open = async (campaign = creatorCampaign()) => {
    loadCampaign.mockResolvedValue(campaign);
    return render(await CampaignDetailPage({ id: CAMPAIGN_ID }));
  };

  it("shows the brief and the application form, with the platform rate as the default price (never above the maximum)", async () => {
    await open();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Summer Glow Launch");
    expect(screen.getByText(/Two stories and one reel/)).toBeInTheDocument();
    expect(screen.getByText(/most the brand will pay each creator/)).toBeInTheDocument();
    expect(screen.getByLabelText("Your price (CFA)")).toHaveValue("85000");
    await userEvent.setup().selectOptions(screen.getByLabelText("Platform"), "tiktok");
    expect(screen.getByLabelText("Your price (CFA)")).toHaveValue("200000"); // rate 300,000 capped at the brand's maximum
  });

  it("validates locally and sends nothing", async () => {
    const user = userEvent.setup();
    await open();
    await user.clear(screen.getByLabelText("Your price (CFA)"));
    await user.type(screen.getByLabelText("Your price (CFA)"), "250000");
    await user.type(screen.getByLabelText("Your pitch"), "short");
    await user.click(screen.getByRole("button", { name: "Send application" }));
    expect(await screen.findByText(/brand's maximum is 200,000 CFA/)).toBeInTheDocument();
    expect(screen.getByText("Write at least 10 characters.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Nothing was sent");
    expect(applyToCampaignAction).not.toHaveBeenCalled();
  });

  it("sends the campaign, platform, price and pitch, then says it was sent only after the API confirmed and refreshes", async () => {
    applyToCampaignAction.mockResolvedValue({ ok: true, offer: offerView() });
    const user = userEvent.setup();
    await open();
    await user.type(screen.getByLabelText("Your pitch"), "I would make three honest reels.");
    await user.click(screen.getByRole("button", { name: "Send application" }));
    await waitFor(() => expect(applyToCampaignAction).toHaveBeenCalledWith({ campaignId: CAMPAIGN_ID, platform: "instagram", priceXaf: 85_000, pitch: "I would make three honest reels." }));
    expect(await screen.findByRole("status")).toHaveTextContent("Your application was sent");
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Application sent" })).toBeDisabled();
  });

  it("an API refusal keeps what was typed, shows the reason and says nothing was sent", async () => {
    applyToCampaignAction.mockResolvedValue({ ok: false, error: { kind: "validation", fields: { price: "below the minimum" }, message: "That price is below the platform's minimum price for a platform rate." } });
    const user = userEvent.setup();
    await open();
    await user.type(screen.getByLabelText("Your pitch"), "I would make three honest reels.");
    await user.click(screen.getByRole("button", { name: "Send application" }));
    expect(await screen.findByText("below the minimum")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Nothing was sent");
    expect(screen.getByLabelText("Your pitch")).toHaveValue("I would make three honest reels.");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("an ended session offers sign-in with a way back; a network failure is retryable", async () => {
    applyToCampaignAction.mockResolvedValueOnce({ ok: false, error: { kind: "unauthenticated" } }).mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ ok: true, offer: offerView() });
    const user = userEvent.setup();
    await open();
    await user.type(screen.getByLabelText("Your pitch"), "I would make three honest reels.");
    await user.click(screen.getByRole("button", { name: "Send application" }));
    expect(within(await screen.findByRole("alert")).getByRole("link", { name: "Sign in again" })).toHaveAttribute("href", `/sign-in?next=${encodeURIComponent(`/creator/campaigns/${CAMPAIGN_ID}`)}&expired=1`);
    await user.click(screen.getByRole("button", { name: "Send application" }));
    await waitFor(() => expect(applyToCampaignAction).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nothing was changed");
    await user.click(screen.getByRole("button", { name: "Send application" }));
    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  it("two submits in the same instant send one application", async () => {
    applyToCampaignAction.mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();
    const { container } = await open();
    await user.type(screen.getByLabelText("Your pitch"), "I would make three honest reels.");
    const form = container.querySelector("form")!;
    act(() => {
      form.requestSubmit();
      form.requestSubmit();
    });
    expect(applyToCampaignAction).toHaveBeenCalledTimes(1);
  });

  it("shows the state of an existing application instead of the form, with Withdraw only while pending", async () => {
    loadMyOffer.mockResolvedValue(offerView({ origin: "campaign_match", initiator: "creator", hire: null }));
    const { unmount } = await open(creatorCampaign({ myOffer: { id: OFFER_ID, status: "pending" } }));
    expect(screen.queryByLabelText("Your pitch")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Your application" })).toHaveTextContent("Pending");
    expect(screen.getByRole("button", { name: "Withdraw application" })).toBeInTheDocument();
    unmount();
    loadMyOffer.mockResolvedValue(offerView({ origin: "campaign_match", initiator: "creator", hire: null, status: "declined" }));
    await open(creatorCampaign({ myOffer: { id: OFFER_ID, status: "declined" } }));
    expect(screen.getByText(/can't apply to this campaign again/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Withdraw application" })).not.toBeInTheDocument();
  });

  it("a platform INVITATION is shown as an invitation to answer in the inbox, never as an application: no Withdraw button, no form", async () => {
    loadMyOffer.mockResolvedValue(invitationView());
    await open(creatorCampaign({ myOffer: { id: OFFER_ID, status: "pending" } }));
    expect(screen.getByRole("region", { name: "Your invitation" })).toHaveTextContent("You were invited to this campaign");
    expect(screen.getByText(/Accept or decline the invitation in your requests/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Withdraw application" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Your pitch")).not.toBeInTheDocument();
    expect(screen.queryByText(/Waiting for the brand/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Answer the invitation" })).toHaveAttribute("href", "/creator/requests");
  });

  it("an ineligible creator gets the reason and no form; a creator with no platforms is told so", async () => {
    const { unmount } = await open(creatorCampaign({ minEngagement: { pct: 5, label: "5%+" }, eligibility: { meetsMinEngagement: false, canApply: false } }));
    expect(screen.getByRole("note")).toHaveTextContent(/engagement rate is below this campaign's minimum/);
    expect(screen.queryByLabelText("Your pitch")).not.toBeInTheDocument();
    unmount();
    loadMyPlatforms.mockResolvedValue([]);
    await open();
    expect(screen.getByText(/profile has no platforms yet/)).toBeInTheDocument();
  });

  it("a campaign that isn't open is the normal 'not found' page", async () => {
    loadCampaign.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    await expect(CampaignDetailPage({ id: CAMPAIGN_ID })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("withdraw button", () => {
  it("asks first, then refreshes after the API confirmed; declining does nothing", async () => {
    withdrawApplicationAction.mockResolvedValue({ ok: true, offer: offerView({ status: "withdrawn" }) });
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    const user = userEvent.setup();
    render(<WithdrawButton offerId={OFFER_ID} returnTo="/creator/requests" />);
    await user.click(screen.getByRole("button", { name: "Withdraw application" }));
    expect(withdrawApplicationAction).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Withdraw application" }));
    await waitFor(() => expect(withdrawApplicationAction).toHaveBeenCalledWith({ id: OFFER_ID }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("a refusal is explained, nothing is claimed, the page refreshes; two clicks in one instant send one request", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    withdrawApplicationAction.mockResolvedValueOnce({ ok: false, error: { kind: "conflict", code: "offer_not_pending", message: "That application has already been answered or has closed, so it can't be withdrawn." } }).mockReturnValueOnce(new Promise(() => undefined));
    const user = userEvent.setup();
    render(<WithdrawButton offerId={OFFER_ID} returnTo="/creator/requests" />);
    await user.click(screen.getByRole("button", { name: "Withdraw application" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/already been answered.*Nothing was changed/);
    expect(refresh).toHaveBeenCalled();
    const button = screen.getByRole("button", { name: "Withdraw application" });
    act(() => {
      button.click();
      button.click();
    });
    expect(withdrawApplicationAction).toHaveBeenCalledTimes(2);
  });
});
