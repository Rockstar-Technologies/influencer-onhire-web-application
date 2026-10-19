// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { campaignToForm, EMPTY_CAMPAIGN_FORM } from "@/features/brand-campaigns/mapping";
import { CAMPAIGN_ID, CAMPAIGN_OPTIONS, campaignListItem, campaignView } from "../helpers";
import { RedirectSignal } from "../mocks/next";

const push = vi.fn();
const replace = vi.fn();
const refresh = vi.fn();
const saveCampaignAction = vi.fn();
const transitionCampaignAction = vi.fn();
const loadCampaigns = vi.fn();
const loadCampaign = vi.fn();
const loadCampaignOptions = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, refresh }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/features/brand-campaigns/actions", () => ({
  saveCampaignAction: (...a: unknown[]) => saveCampaignAction(...a),
  transitionCampaignAction: (...a: unknown[]) => transitionCampaignAction(...a),
}));
vi.mock("@/features/brand-campaigns/server", async (original) => ({
  ...(await original<typeof import("@/features/brand-campaigns/server")>()),
  loadCampaigns: (...a: unknown[]) => loadCampaigns(...a),
  loadCampaign: (...a: unknown[]) => loadCampaign(...a),
  loadCampaignOptions: (...a: unknown[]) => loadCampaignOptions(...a),
}));

const { CampaignForm } = await import("@/features/brand/campaigns/campaign-form");
const { CampaignActions } = await import("@/features/brand/campaigns/campaign-actions");
const { CampaignsListPage } = await import("@/features/brand/campaigns/campaigns-list-page");
const { CampaignDetailPage } = await import("@/features/brand/campaigns/campaign-detail-page");
const { NewCampaignPage } = await import("@/features/brand/campaigns/new-campaign-page");

beforeEach(() => {
  for (const mock of [push, replace, refresh, saveCampaignAction, transitionCampaignAction, loadCampaigns, loadCampaign, loadCampaignOptions]) mock.mockReset();
  loadCampaignOptions.mockResolvedValue(CAMPAIGN_OPTIONS);
});

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Campaign Title/), "Summer Glow Launch");
  await user.selectOptions(screen.getByLabelText(/Niche/), "beauty");
  await user.type(screen.getByLabelText(/Maximum budget per creator/), "500000");
  fireEvent.change(screen.getByLabelText(/Start Date/), { target: { value: "2099-03-01" } });
  fireEvent.change(screen.getByLabelText(/End Date/), { target: { value: "2099-03-31" } });
  await user.type(screen.getByLabelText(/Expectations/), "1 story and 2 TikToks please");
}

describe("campaign form: options come from the API", () => {
  it("offers the API's niches, cities, interests, age ranges and engagement levels by slug and code", () => {
    const { container } = render(<CampaignForm options={CAMPAIGN_OPTIONS} draftId={null} initial={EMPTY_CAMPAIGN_FORM} />);
    const niches = [...(screen.getByLabelText(/Niche/) as HTMLSelectElement).options].map((o) => [o.value, o.textContent]);
    expect(niches).toContainEqual(["sports-fitness", "Sports & Fitness"]);
    expect([...(screen.getByLabelText(/Minimum Engagement Rate/) as HTMLSelectElement).options].map((o) => [o.value, o.textContent])).toEqual([["any", "No minimum"], ["3", "3%+"], ["5", "5%+"], ["7", "7%+"]]);
    const checkboxes = [...container.querySelectorAll<HTMLInputElement>('fieldset input[type="checkbox"]')];
    expect(checkboxes.map((c) => c.closest("label")?.textContent)).toEqual(expect.arrayContaining(["45+", "Douala", "Beauty & skincare"]));
    expect(screen.getByText(/Minimum 50,000 FCFA/)).toBeInTheDocument();
  });

  it("offers no image upload and says so honestly", () => {
    const { container } = render(<CampaignForm options={CAMPAIGN_OPTIONS} draftId={null} initial={EMPTY_CAMPAIGN_FORM} />);
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.getByText(/Image upload isn.t available yet/)).toBeInTheDocument();
  });

  it("has no made-up reach estimate", () => {
    render(<CampaignForm options={CAMPAIGN_OPTIONS} draftId={null} initial={EMPTY_CAMPAIGN_FORM} />);
    expect(document.body.textContent).not.toMatch(/would reach|verified influencers/i);
  });
});

describe("campaign form: saving and submitting", () => {
  it("validates locally, focuses the first problem and sends nothing", async () => {
    const user = userEvent.setup();
    render(<CampaignForm options={CAMPAIGN_OPTIONS} draftId={null} initial={EMPTY_CAMPAIGN_FORM} />);
    await user.click(screen.getByRole("button", { name: "Submit for review" }));
    expect(await screen.findByText("Give your campaign a title.")).toBeInTheDocument();
    expect(saveCampaignAction).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Campaign Title/)).toHaveFocus();
  });

  it("'Save draft' stores a draft through the API, keeps the person on the form and puts the draft in the URL", async () => {
    saveCampaignAction.mockResolvedValue({ ok: true, submitted: false, campaign: campaignView() });
    const user = userEvent.setup();
    render(<CampaignForm options={CAMPAIGN_OPTIONS} draftId={null} initial={EMPTY_CAMPAIGN_FORM} />);
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(saveCampaignAction).toHaveBeenCalledTimes(1));
    const sent = saveCampaignAction.mock.calls[0]![0];
    expect(sent).toMatchObject({ id: null, submit: false, campaign: { title: "Summer Glow Launch", niche: "beauty", budgetXaf: 500000, minEngagementPct: null, imageFileIds: [] } });
    expect(await screen.findByRole("status")).toHaveTextContent("Draft saved");
    expect(replace).toHaveBeenCalledWith(`/campaigns/new?draft=${CAMPAIGN_ID}`, { scroll: false });
    expect(push).not.toHaveBeenCalled();
  });

  it("a second save updates the same draft (the id is sent), never creating another", async () => {
    saveCampaignAction.mockResolvedValue({ ok: true, submitted: false, campaign: campaignView() });
    const user = userEvent.setup();
    render(<CampaignForm options={CAMPAIGN_OPTIONS} draftId={null} initial={EMPTY_CAMPAIGN_FORM} />);
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByRole("status");
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(saveCampaignAction).toHaveBeenCalledTimes(2));
    expect(saveCampaignAction.mock.calls[0]![0].id).toBeNull();
    expect(saveCampaignAction.mock.calls[1]![0].id).toBe(CAMPAIGN_ID);
  });

  it("'Submit for review' goes to the campaign's status page only after the API confirmed", async () => {
    saveCampaignAction.mockResolvedValue({ ok: true, submitted: true, campaign: campaignView({ status: "pending_review" }) });
    const user = userEvent.setup();
    render(<CampaignForm options={CAMPAIGN_OPTIONS} draftId={null} initial={EMPTY_CAMPAIGN_FORM} />);
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Submit for review" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/brand/campaigns/${CAMPAIGN_ID}?submitted=1`));
    expect(saveCampaignAction.mock.calls[0]![0]).toMatchObject({ submit: true });
  });

  it("restores a saved draft's values and keeps editing the same draft", async () => {
    saveCampaignAction.mockResolvedValue({ ok: true, submitted: false, campaign: campaignView() });
    const user = userEvent.setup();
    render(<CampaignForm options={CAMPAIGN_OPTIONS} draftId={CAMPAIGN_ID} initial={campaignToForm(campaignView())} />);
    expect(screen.getByLabelText(/Campaign Title/)).toHaveValue("Summer Glow Launch");
    expect(screen.getByLabelText(/Niche/)).toHaveValue("beauty");
    expect(screen.getByLabelText(/Maximum budget per creator/)).toHaveValue("500,000");
    expect(screen.getByLabelText(/Minimum Engagement Rate/)).toHaveValue("5");
    expect(screen.getByText("Editing a saved draft.")).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/Campaign Title/));
    await user.type(screen.getByLabelText(/Campaign Title/), "Renamed");
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(saveCampaignAction).toHaveBeenCalled());
    expect(saveCampaignAction.mock.calls[0]![0]).toMatchObject({ id: CAMPAIGN_ID, campaign: { title: "Renamed", ageRanges: ["45-plus"], cities: ["douala"] } });
  });

  it("shows the API's field errors, says nothing was saved and keeps what was typed", async () => {
    saveCampaignAction.mockResolvedValue({ ok: false, savedId: null, error: { kind: "validation", fields: { startDate: "must not be in the past" }, message: "The start date is in the past." } });
    const user = userEvent.setup();
    render(<CampaignForm options={CAMPAIGN_OPTIONS} draftId={null} initial={EMPTY_CAMPAIGN_FORM} />);
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Submit for review" }));
    expect(await screen.findByText("must not be in the past")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Nothing was saved");
    expect(screen.getByLabelText(/Campaign Title/)).toHaveValue("Summer Glow Launch");
    expect(push).not.toHaveBeenCalled();
  });

  it("if the draft was saved but submitting failed it says exactly that and the next try updates that draft", async () => {
    saveCampaignAction.mockResolvedValueOnce({ ok: false, savedId: CAMPAIGN_ID, error: { kind: "unavailable", requestId: null } }).mockResolvedValueOnce({ ok: true, submitted: true, campaign: campaignView({ status: "pending_review" }) });
    const user = userEvent.setup();
    render(<CampaignForm options={CAMPAIGN_OPTIONS} draftId={null} initial={EMPTY_CAMPAIGN_FORM} />);
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Submit for review" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/saved as a draft, but the campaign was not submitted/);
    expect(replace).toHaveBeenCalledWith(`/campaigns/new?draft=${CAMPAIGN_ID}`, { scroll: false });
    await user.click(screen.getByRole("button", { name: "Submit for review" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/brand/campaigns/${CAMPAIGN_ID}?submitted=1`));
    expect(saveCampaignAction.mock.calls[1]![0].id).toBe(CAMPAIGN_ID);
  });

  it("an ended session keeps the form, says the changes were not saved and links to sign-in", async () => {
    saveCampaignAction.mockResolvedValue({ ok: false, savedId: null, error: { kind: "unauthenticated" } });
    const user = userEvent.setup();
    render(<CampaignForm options={CAMPAIGN_OPTIONS} draftId={null} initial={EMPTY_CAMPAIGN_FORM} />);
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/session has ended/i);
    expect(within(alert).getByRole("link", { name: "Sign in again" })).toHaveAttribute("href", expect.stringContaining("/sign-in?next=%2Fcampaigns%2Fnew"));
    expect(screen.getByLabelText(/Campaign Title/)).toHaveValue("Summer Glow Launch");
  });

  it("a network failure is retryable with the same form", async () => {
    saveCampaignAction.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ ok: true, submitted: false, campaign: campaignView() });
    const user = userEvent.setup();
    render(<CampaignForm options={CAMPAIGN_OPTIONS} draftId={null} initial={EMPTY_CAMPAIGN_FORM} />);
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nothing was saved");
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(saveCampaignAction).toHaveBeenCalledTimes(2);
  });

  it("two submits fired in the same instant send one request (no duplicate campaign)", async () => {
    let finish: (value: unknown) => void = () => undefined;
    saveCampaignAction.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    const { container } = render(<CampaignForm options={CAMPAIGN_OPTIONS} draftId={null} initial={EMPTY_CAMPAIGN_FORM} />);
    await fillValid(user);
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(saveCampaignAction).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("button", { name: "Submitting…" })).toBeDisabled();
    finish({ ok: true, submitted: true, campaign: campaignView({ status: "pending_review" }) });
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  });
});

describe("lifecycle buttons follow the real status", () => {
  const buttons = (status: Parameters<typeof CampaignActions>[0]["status"]) => {
    const { unmount } = render(<CampaignActions id={CAMPAIGN_ID} status={status} />);
    const names = screen.queryAllByText(/^(Edit draft|Submit for review|Delete draft|Withdraw from review|Cancel campaign)$/).map((e) => e.textContent);
    unmount();
    return names;
  };

  it.each([
    ["draft", ["Edit draft", "Submit for review", "Delete draft"]],
    ["pending_review", ["Withdraw from review"]],
    ["open", ["Cancel campaign"]],
    ["accepted", []],
    ["in_progress", []],
    ["completed", []],
    ["rejected", []],
    ["cancelled", []],
  ] as const)("%s shows %j", (status, expected) => {
    expect(buttons(status)).toEqual(expected);
  });

  it("cancelling asks first, then refreshes to show the real status", async () => {
    transitionCampaignAction.mockResolvedValue({ ok: true, campaign: campaignView({ status: "cancelled" }), deleted: false });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<CampaignActions id={CAMPAIGN_ID} status="pending_review" />);
    await user.click(screen.getByRole("button", { name: "Withdraw from review" }));
    await waitFor(() => expect(transitionCampaignAction).toHaveBeenCalledWith({ id: CAMPAIGN_ID, kind: "cancel" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("declining the confirmation does nothing", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<CampaignActions id={CAMPAIGN_ID} status="draft" />);
    await user.click(screen.getByRole("button", { name: "Delete draft" }));
    expect(transitionCampaignAction).not.toHaveBeenCalled();
  });

  it("deleting a draft returns to the list; submitting refreshes", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    transitionCampaignAction.mockResolvedValueOnce({ ok: true, campaign: null, deleted: true }).mockResolvedValueOnce({ ok: true, campaign: campaignView({ status: "pending_review" }), deleted: false });
    const user = userEvent.setup();
    const { unmount } = render(<CampaignActions id={CAMPAIGN_ID} status="draft" />);
    await user.click(screen.getByRole("button", { name: "Delete draft" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/brand/campaigns"));
    unmount();
    render(<CampaignActions id={CAMPAIGN_ID} status="draft" />);
    await user.click(screen.getByRole("button", { name: "Submit for review" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("a refused cancel (offers already exist) is explained in plain language and the page is refreshed to the real state", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    transitionCampaignAction.mockResolvedValue({ ok: false, error: { kind: "conflict", code: "campaign_has_active_offers", message: "Creators have already responded to this campaign, so it can't be cancelled yet." } });
    const user = userEvent.setup();
    render(<CampaignActions id={CAMPAIGN_ID} status="open" />);
    await user.click(screen.getByRole("button", { name: "Cancel campaign" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Creators have already responded/);
    expect(refresh).toHaveBeenCalled();
  });

  it("a double click sends one request", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    let finish: (value: unknown) => void = () => undefined;
    transitionCampaignAction.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(<CampaignActions id={CAMPAIGN_ID} status="draft" />);
    await user.dblClick(screen.getByRole("button", { name: "Submit for review" }));
    expect(transitionCampaignAction).toHaveBeenCalledTimes(1);
    finish({ ok: true, campaign: campaignView({ status: "pending_review" }), deleted: false });
  });
});

describe("campaign list and detail pages (server-rendered from the API)", () => {
  it("lists the brand's campaigns with their real statuses, links and amounts", async () => {
    loadCampaigns.mockResolvedValue({
      status: null,
      nextCursor: "abc",
      items: [campaignListItem({ title: "A draft", status: "draft" }), campaignListItem({ id: "44444444-4444-4444-8444-444444444444", title: "Waiting", status: "pending_review", reference: "CMP-8" })],
    });
    render(await CampaignsListPage({}));
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(within(rows[1]!).getByRole("link", { name: "A draft" })).toHaveAttribute("href", `/brand/campaigns/${CAMPAIGN_ID}`);
    expect(rows[1]).toHaveTextContent("Draft");
    expect(rows[2]).toHaveTextContent("Pending review");
    expect(rows[1]).toHaveTextContent("500,000 CFA");
    expect(screen.getByRole("link", { name: "Show more" })).toHaveAttribute("href", "/brand/campaigns?cursor=abc");
  });

  it("filters by a real status and shows an honest empty state", async () => {
    loadCampaigns.mockResolvedValue({ status: "open", nextCursor: null, items: [] });
    render(await CampaignsListPage({ status: "open" }));
    expect(screen.getByText("No campaigns with this status.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute("aria-current", "page");
    expect(loadCampaigns).toHaveBeenCalledWith({ status: "open" });
  });

  it("shows an empty list as 'no campaigns yet' with a way to start", async () => {
    loadCampaigns.mockResolvedValue({ status: null, nextCursor: null, items: [] });
    render(await CampaignsListPage({}));
    expect(screen.getByText("You haven't created a campaign yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create a campaign" })).toHaveAttribute("href", "/campaigns/new");
  });

  it("detail: shows every stored field, the status, and the reviewer's note on a rejected campaign", async () => {
    loadCampaign.mockResolvedValue(campaignView({ status: "rejected", reviewNote: "Please narrow the audience.", reviewedAt: "2026-10-20T09:00:00.000Z", submittedAt: "2026-10-19T11:00:00.000Z" }));
    render(await CampaignDetailPage({ id: CAMPAIGN_ID, justSubmitted: false }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Summer Glow Launch");
    expect(screen.getAllByText("Rejected").length).toBeGreaterThan(0);
    expect(screen.getByRole("note", { name: "Reviewer's note" })).toHaveTextContent("Please narrow the audience.");
    expect(screen.getByText("Douala")).toBeInTheDocument();
    expect(screen.getByText("45+")).toBeInTheDocument();
    expect(screen.getByText("5%+")).toBeInTheDocument();
    expect(screen.getByText(/can't be edited or resubmitted/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument(); // rejected is terminal: no actions
  });

  it("detail: the 'submitted' banner appears only when the API really says pending review", async () => {
    loadCampaign.mockResolvedValue(campaignView({ status: "pending_review", submittedAt: "2026-10-19T11:00:00.000Z" }));
    const { unmount } = render(await CampaignDetailPage({ id: CAMPAIGN_ID, justSubmitted: true }));
    expect(screen.getByRole("status")).toHaveTextContent("submitted for review");
    unmount();
    loadCampaign.mockResolvedValue(campaignView({ status: "draft" }));
    render(await CampaignDetailPage({ id: CAMPAIGN_ID, justSubmitted: true }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("new-campaign page: loads a saved draft for editing, but sends anything already submitted to its status page", async () => {
    loadCampaign.mockResolvedValue(campaignView({ status: "draft" }));
    render(await NewCampaignPage({ draftId: CAMPAIGN_ID }));
    expect(screen.getByLabelText(/Campaign Title/)).toHaveValue("Summer Glow Launch");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Edit your draft");

    loadCampaign.mockResolvedValue(campaignView({ status: "pending_review" }));
    await expect(NewCampaignPage({ draftId: CAMPAIGN_ID })).rejects.toMatchObject({ url: `/brand/campaigns/${CAMPAIGN_ID}` });
  });

  it("new-campaign page: a draft id that is not a UUID is 'not found' without asking the API; a budget from the finder pre-fills only digits", async () => {
    await expect(NewCampaignPage({ draftId: "../admin" })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(loadCampaign).not.toHaveBeenCalled();
    render(await NewCampaignPage({ budget: "750000" }));
    expect(screen.getByLabelText(/Maximum budget per creator/)).toHaveValue("750,000");
  });

  it("new-campaign page: ignores a budget that is not plain digits", async () => {
    render(await NewCampaignPage({ budget: "9e9<script>" }));
    expect(screen.getByLabelText(/Maximum budget per creator/)).toHaveValue("");
  });

  it("the page's guidance makes no claim the platform cannot keep", async () => {
    render(await NewCampaignPage({}));
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/notified the moment|we'll suggest other|Cross-checks their audience|until an influencer accepts it/i);
    expect(text).toMatch(/not used to pick creators/);
  });
});
