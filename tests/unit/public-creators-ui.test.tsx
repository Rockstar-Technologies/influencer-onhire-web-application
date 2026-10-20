// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { publicCard, publicFilters, publicProfile } from "../helpers";

const push = vi.fn();
const loadDirectory = vi.fn();
const loadFilters = vi.fn();
const loadFeatured = vi.fn();
const loadPublicProfile = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/influencers",
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/features/public/creators/server", async (original) => ({
  ...(await original<typeof import("@/features/public/creators/server")>()),
  loadDirectory: (...a: unknown[]) => loadDirectory(...a),
  loadFilters: (...a: unknown[]) => loadFilters(...a),
  loadFeatured: (...a: unknown[]) => loadFeatured(...a),
  loadPublicProfile: (...a: unknown[]) => loadPublicProfile(...a),
}));

const { InfluencerResults } = await import("@/features/public/influencers/sections/influencer-results");
const { InfluencerSearch } = await import("@/features/public/influencers/sections/influencer-search");
const { buildSearchOptions } = await import("@/features/public/creators/query");
const { InfluencerProfilePage } = await import("@/features/public/influencer-profile/influencer-profile-page");
const { FeaturedInfluencers } = await import("@/features/public/home/sections/featured-influencers");
const { InfluencerCard } = await import("@/components/shared/influencer-card");

beforeEach(() => {
  for (const mock of [push, loadDirectory, loadFilters, loadFeatured, loadPublicProfile]) mock.mockReset();
  loadFilters.mockResolvedValue(publicFilters);
});

describe("the directory page", () => {
  const query = { q: "", sort: "", filters: {} };

  it("shows the API's creators with only public facts, and links to the profile and the real hire flow", async () => {
    loadDirectory.mockResolvedValue({ items: [publicCard(), publicCard({ username: "kevin.fit", displayName: "Kevin Fit", rating: null, successRatePct: null, engagementRatePct: null, language: null, niches: [{ slug: "fitness", name: "Fitness" }], primaryNiche: "fitness" })], nextCursor: "abc" });
    render(await InfluencerResults({ query }));
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(2);
    expect(within(cards[0]!).getByRole("heading", { level: 3 })).toHaveTextContent("Amina Beauty");
    expect(cards[0]).toHaveTextContent("Beauty");
    expect(cards[0]).toHaveTextContent("Douala");
    expect(cards[0]).toHaveTextContent("From 85,000 CFA");
    expect(cards[0]).toHaveTextContent("4.8");
    expect(cards[0]).toHaveTextContent("100% success");
    expect(within(cards[0]!).getByRole("link", { name: "Details" })).toHaveAttribute("href", "/influencers/amina.beauty");
    expect(within(cards[0]!).getByRole("link", { name: "Hire" })).toHaveAttribute("href", "/influencers/amina.beauty/hire");
    // missing figures are stated as missing, never invented
    expect(cards[1]).toHaveTextContent("No reviews yet");
    expect(cards[1]).not.toHaveTextContent(/success|engagement/);
    expect(document.body.textContent).not.toMatch(/@gmail|phone|activity|Active (today|now)/i);
  });

  it("shows how many it lists (no invented total) and a way to the next page that keeps the filters", async () => {
    loadDirectory.mockResolvedValue({ items: [publicCard()], nextCursor: "abc" });
    render(await InfluencerResults({ query: { q: "amina", sort: "newest", filters: { niche: ["beauty"] } } }));
    expect(screen.getByText(/Showing/)).toHaveTextContent("Showing 1 influencer");
    expect(document.body.textContent).not.toMatch(/\d+ influencers found/);
    expect(screen.getByRole("link", { name: "Show more influencers" })).toHaveAttribute("href", "/influencers?q=amina&sort=newest&niche=beauty&cursor=abc");
  });

  it("on a later page it offers the way back to the first page; the last page has no 'show more'", async () => {
    loadDirectory.mockResolvedValue({ items: [publicCard()], nextCursor: null });
    render(await InfluencerResults({ query: { ...query, cursor: "abc" } }));
    expect(screen.getByRole("link", { name: "Back to the first page" })).toHaveAttribute("href", "/influencers");
    expect(screen.queryByRole("link", { name: "Show more influencers" })).not.toBeInTheDocument();
  });

  it("an empty result is an honest empty state with a way to clear the filters", async () => {
    loadDirectory.mockResolvedValue({ items: [], nextCursor: null });
    render(await InfluencerResults({ query: { q: "zzzz", sort: "", filters: {} } }));
    expect(screen.getByText("No influencers match these filters")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/influencers");
  });

  it("the filter panel offers the API's niches, cities, platforms and languages", () => {
    render(<InfluencerSearch options={buildSearchOptions(publicFilters)} query={query}><p>results</p></InfluencerSearch>);
    const filters = screen.getByRole("complementary", { name: "Filter influencers" });
    for (const label of ["Beauty", "Tech", "Douala", "Yaoundé", "Instagram", "TikTok", "Bilingual"]) expect(within(filters).getByRole("button", { name: label })).toBeInTheDocument();
    expect(within(filters).queryByRole("button", { name: "Fashion" })).not.toBeInTheDocument(); // not in the API's list
  });

  it("changing a filter, the search or the sort goes back to the first page (the old cursor is dropped) and keeps the rest", async () => {
    const user = userEvent.setup();
    render(<InfluencerSearch options={buildSearchOptions(publicFilters)} query={{ q: "amina", sort: "newest", filters: { niche: ["beauty"] }, cursor: "page2" }}><p>results</p></InfluencerSearch>);
    await user.click(within(screen.getByRole("complementary", { name: "Filter influencers" })).getByRole("button", { name: "Douala" }));
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    const href = push.mock.calls[0]![0] as string;
    expect(href).not.toContain("cursor");
    expect(href).toContain("location=douala");
    expect(href).toContain("niche=beauty");
    expect(href).toContain("q=amina");
    expect(href).toContain("sort=newest");
  });

  it("an API failure reaches the error page instead of showing 'no results'", async () => {
    loadDirectory.mockRejectedValue(new Error("down"));
    await expect(InfluencerResults({ query })).rejects.toThrow("down");
  });
});

describe("the profile page", () => {
  it("shows the public fields: bio, collaborations, rates with handles, terms, engagement marked 'verified' only when the API says so", async () => {
    loadPublicProfile.mockResolvedValue(publicProfile());
    render(await InfluencerProfilePage({ username: "amina.beauty" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Amina Beauty");
    expect(screen.getByText(/short beauty reels/)).toBeInTheDocument();
    expect(screen.getByText("MTN Cameroon")).toBeInTheDocument();
    expect(screen.getByText(/@amina.beauty · 52K followers/)).toBeInTheDocument();
    expect(screen.getByText("85,000 CFA")).toBeInTheDocument();
    expect(screen.getByText("120,000 CFA")).toBeInTheDocument();
    expect(screen.getByText("Minimum booking: 2 weeks")).toBeInTheDocument();
    expect(screen.getByText("2 rounds of revisions")).toBeInTheDocument();
    expect(screen.getByText("Content usage rights: 6 months")).toBeInTheDocument();
    expect(document.body.textContent).toContain("Verified by our team");
    expect(screen.getByRole("link", { name: "Hire Amina" })).toHaveAttribute("href", "/influencers/amina.beauty/hire");
    expect(screen.getByRole("link", { name: "Back to Influencers" })).toHaveAttribute("href", "/influencers");
  });

  it("never shows payment methods, deposit wording, a photo or an activity badge", async () => {
    loadPublicProfile.mockResolvedValue(publicProfile());
    const { container } = render(await InfluencerProfilePage({ username: "amina.beauty" }));
    expect(document.body.textContent).not.toMatch(/Payment Methods|MTN MoMo|Orange Money|deposit|escrow|Bank transfer|Active (today|now)/i);
    expect(container.querySelector("img")).toBeNull();
  });

  it("optional parts are left out or stated as missing, never invented", async () => {
    loadPublicProfile.mockResolvedValue(publicProfile({ bio: null, contentStyle: null, brandFit: [], collaborations: [], engagementRatePct: null, verifiedFields: [], language: null, terms: { deliverables: null, revisionsRounds: null, usageRightsMonths: null }, metrics: { rating: null, successRatePct: null } }));
    render(await InfluencerProfilePage({ username: "amina.beauty" }));
    expect(screen.getByText("This creator hasn't added a description yet.")).toBeInTheDocument();
    expect(screen.getByText("This creator hasn't shared an engagement rate.")).toBeInTheDocument();
    expect(screen.getByText("No reviews yet")).toBeInTheDocument();
    expect(screen.queryByText("Content Style")).not.toBeInTheDocument();
    expect(screen.queryByText("Brand Fit")).not.toBeInTheDocument();
    expect(screen.queryByText("Past Collaborations")).not.toBeInTheDocument();
    expect(screen.queryByText(/success rate/)).not.toBeInTheDocument();
  });

  it("an engagement rate the creator reported is not called verified", async () => {
    loadPublicProfile.mockResolvedValue(publicProfile({ verifiedFields: [] }));
    render(await InfluencerProfilePage({ username: "amina.beauty" }));
    expect(document.body.textContent).toContain("Reported by the creator");
    expect(document.body.textContent).not.toContain("Verified by our team");
  });

  it("an unknown or non-public creator is the normal 'not found' page", async () => {
    loadPublicProfile.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    await expect(InfluencerProfilePage({ username: "ghost.user" })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("home page featured creators", () => {
  it("shows the API's recommended creators, and nothing at all when there are none", async () => {
    loadFeatured.mockResolvedValue({ items: [publicCard()], nextCursor: null });
    const { unmount } = render(await FeaturedInfluencers());
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Amina Beauty");
    expect(screen.getByRole("link", { name: /Browse all influencers/ })).toHaveAttribute("href", "/influencers");
    expect(document.body.textContent).not.toMatch(/Verified influencers with proven reach|most sought-after/i);
    unmount();
    loadFeatured.mockResolvedValue({ items: [], nextCursor: null });
    const { container } = render(await FeaturedInfluencers());
    expect(container).toBeEmptyDOMElement();
  });

  it("a single card renders on its own", () => {
    render(<InfluencerCard influencer={publicCard({ followers: { total: 0, platforms: [] } })} />);
    expect(screen.getByRole("article")).toHaveTextContent("Amina Beauty");
  });
});
