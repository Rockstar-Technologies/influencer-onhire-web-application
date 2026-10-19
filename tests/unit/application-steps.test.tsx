// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { audienceFromState, profileFromState, ratesFromState } from "@/features/creator-application/mapping";
import { BIO, OPTIONS, applicationState, completeDraft } from "../helpers";

const push = vi.fn();
const refresh = vi.fn();
const saveProfileAction = vi.fn();
const saveAudienceAction = vi.fn();
const saveRatesAction = vi.fn();
const submitApplicationAction = vi.fn();
const reapplyAction = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh, replace: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/creator-application/actions", () => ({
  saveProfileAction: (...a: unknown[]) => saveProfileAction(...a),
  saveAudienceAction: (...a: unknown[]) => saveAudienceAction(...a),
  saveRatesAction: (...a: unknown[]) => saveRatesAction(...a),
  submitApplicationAction: (...a: unknown[]) => submitApplicationAction(...a),
  reapplyAction: (...a: unknown[]) => reapplyAction(...a),
}));

const { ProfileStep } = await import("@/features/public/creator-apply/steps/profile-step");
const { AudienceStep } = await import("@/features/public/creator-apply/steps/audience-step");
const { RatesStep } = await import("@/features/public/creator-apply/steps/rates-step");
const { SubmittedView } = await import("@/features/public/creator-apply/steps/submitted-view");
const { ReapplyButton } = await import("@/features/public/creator-apply/steps/reapply-button");

beforeEach(() => {
  for (const mock of [push, refresh, saveProfileAction, saveAudienceAction, saveRatesAction, submitApplicationAction, reapplyAction]) mock.mockReset();
});

const profileProps = (state = applicationState()) => {
  const { form, preserved } = profileFromState(state);
  return { options: OPTIONS, initial: form, preserved };
};

describe("profile step", () => {
  it("shows the saved draft, with the API's niches and cities (slugs as values, names as labels)", () => {
    render(<ProfileStep {...profileProps(completeDraft())} />);
    expect(screen.getByLabelText("Creator name")).toHaveValue("Amina Beauty");
    expect(screen.getByLabelText("Niche")).toHaveValue("beauty");
    expect(screen.getByLabelText("City")).toHaveValue("douala");
    expect(screen.getByLabelText("About you")).toHaveValue(BIO);
    const niches = [...(screen.getByLabelText("Niche") as HTMLSelectElement).options].map((o) => [o.value, o.textContent]);
    expect(niches).toContainEqual(["sports-fitness", "Sports & Fitness"]);
    expect([...(screen.getByLabelText("City") as HTMLSelectElement).options].map((o) => o.value)).toContain("yaounde");
  });

  it("starts empty for a new application", () => {
    render(<ProfileStep {...profileProps()} />);
    expect(screen.getByLabelText("Creator name")).toHaveValue("");
    expect(screen.getByLabelText("Niche")).toHaveValue("");
  });

  it("offers no photo upload and says so honestly instead of pretending a photo was attached", () => {
    const { container } = render(<ProfileStep {...profileProps()} />);
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.getByText(/Photo upload isn.t available yet/i)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("validates locally with the API's limits and does not call the server", async () => {
    const user = userEvent.setup();
    render(<ProfileStep {...profileProps()} />);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText("Enter your creator name.")).toBeInTheDocument();
    expect(screen.getByText("Choose the niche you're known for.")).toBeInTheDocument();
    expect(screen.getByText("Choose your city.")).toBeInTheDocument();
    expect(screen.getByText(/Write at least 40 characters/)).toBeInTheDocument();
    expect(saveProfileAction).not.toHaveBeenCalled();
  });

  it("saves with the API's field names and goes to step 2 only after the API confirmed", async () => {
    saveProfileAction.mockResolvedValue({ ok: true, value: completeDraft() });
    const user = userEvent.setup();
    render(<ProfileStep {...profileProps(completeDraft())} />);
    await user.clear(screen.getByLabelText("Creator name"));
    await user.type(screen.getByLabelText("Creator name"), "  Amina B  ");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(saveProfileAction).toHaveBeenCalledTimes(1));
    expect(saveProfileAction.mock.calls[0]![0]).toEqual({
      displayName: "Amina B",
      primaryNiche: "beauty",
      otherNiches: ["fashion"],
      city: "douala",
      bio: BIO,
      photoFileId: null,
      language: "bilingual",
      contentStyle: "Short reels",
      engagementRatePct: 4.5,
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/for-creators/apply/audience"));
  });

  it("shows the API's field errors, says nothing was saved, and does not move on", async () => {
    saveProfileAction.mockResolvedValue({ ok: false, error: { kind: "validation", fields: { bio: "Bio rejected by the server" }, steps: [], message: null } });
    const user = userEvent.setup();
    render(<ProfileStep {...profileProps(completeDraft())} />);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText("Bio rejected by the server")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Nothing was saved");
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Creator name")).toHaveValue("Amina Beauty"); // what the person typed is kept
  });

  it("an ended session says the changes were not saved and links to sign-in", async () => {
    saveProfileAction.mockResolvedValue({ ok: false, error: { kind: "unauthenticated" } });
    const user = userEvent.setup();
    render(<ProfileStep {...profileProps(completeDraft())} />);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/session has ended/i);
    expect(alert).toHaveTextContent(/not saved/i);
    expect(within(alert).getByRole("link", { name: "Sign in again" })).toHaveAttribute("href", expect.stringContaining("/sign-in?next=%2Ffor-creators%2Fapply%2Fprofile"));
    expect(push).not.toHaveBeenCalled();
  });

  it("a network failure is retryable: the same form can be sent again", async () => {
    saveProfileAction.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ ok: true, value: completeDraft() });
    const user = userEvent.setup();
    render(<ProfileStep {...profileProps(completeDraft())} />);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Nothing was saved/);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/for-creators/apply/audience"));
    expect(saveProfileAction).toHaveBeenCalledTimes(2);
  });

  it("a double click sends one request and shows the saving state", async () => {
    let finish: (value: unknown) => void = () => undefined;
    saveProfileAction.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(<ProfileStep {...profileProps(completeDraft())} />);
    const button = screen.getByRole("button", { name: /continue/i });
    await user.dblClick(button);
    expect(await screen.findByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(saveProfileAction).toHaveBeenCalledTimes(1);
    finish({ ok: true, value: completeDraft() });
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  });

  it("two submits fired in the same instant (key repeat, script) still send one request", async () => {
    let finish: (value: unknown) => void = () => undefined;
    saveProfileAction.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { container } = render(<ProfileStep {...profileProps(completeDraft())} />);
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(saveProfileAction).toHaveBeenCalledTimes(1);
    finish({ ok: true, value: completeDraft() });
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  });

  it("keeps labels and keyboard access: every control is reachable by its label", () => {
    render(<ProfileStep {...profileProps()} />);
    for (const label of ["Creator name", "Niche", "City", "About you"]) expect(screen.getByLabelText(label)).toBeEnabled();
  });
});

describe("audience step", () => {
  const props = (state = completeDraft()) => ({ options: OPTIONS, initial: audienceFromState(state, OPTIONS) });

  it("restores platforms, handles, followers, collaborations and brand fit", () => {
    render(<AudienceStep {...props()} />);
    expect(screen.getByLabelText("Instagram handle")).toHaveValue("@amina");
    expect(screen.getByLabelText("Instagram followers")).toHaveValue("25,000");
    expect(screen.getByLabelText("Brand")).toHaveValue("MTN");
    expect(screen.getByRole("button", { name: /Beauty & Skincare/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Automotive/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("explains the total-followers minimum from the API's limit", async () => {
    const user = userEvent.setup();
    render(<AudienceStep {...props()} />);
    await user.clear(screen.getByLabelText("Instagram followers"));
    await user.type(screen.getByLabelText("Instagram followers"), "500");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText("You need at least 1,000 followers in total to join.")).toBeInTheDocument();
    expect(saveAudienceAction).not.toHaveBeenCalled();
  });

  it("requires a brand-fit choice and a handle that is not a link", async () => {
    const user = userEvent.setup();
    render(<AudienceStep {...props(applicationState())} />);
    await user.click(screen.getByRole("checkbox", { name: /Instagram/ }));
    await user.type(screen.getByLabelText("Instagram handle"), "https://instagram.com/x");
    await user.type(screen.getByLabelText("Instagram followers"), "5000");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText(/not a link/)).toBeInTheDocument();
    expect(screen.getByText(/Pick at least one kind of brand/)).toBeInTheDocument();
    expect(saveAudienceAction).not.toHaveBeenCalled();
  });

  it("sends numbers and ids to the API and continues only after it confirms", async () => {
    saveAudienceAction.mockResolvedValue({ ok: true, value: completeDraft() });
    const user = userEvent.setup();
    render(<AudienceStep {...props()} />);
    await user.click(screen.getByRole("button", { name: /Fashion & Apparel/ }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(saveAudienceAction).toHaveBeenCalledTimes(1));
    expect(saveAudienceAction.mock.calls[0]![0]).toEqual({
      platforms: [{ platform: "instagram", handle: "@amina", followers: 25000 }],
      collaborations: [{ brandName: "MTN", description: null, year: 2024 }],
      brandFit: [1], // Fashion & Apparel (id 2) was switched off
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/for-creators/apply/rates"));
  });

  it("shows a server-side followers rejection and stays on the page", async () => {
    saveAudienceAction.mockResolvedValue({ ok: false, error: { kind: "validation", fields: { platforms: "total followers 500 is below the minimum of 1000" }, steps: [], message: "You need at least 1000 followers in total to join" } });
    const user = userEvent.setup();
    render(<AudienceStep {...props()} />);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText("total followers 500 is below the minimum of 1000")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Nothing was saved");
    expect(push).not.toHaveBeenCalled();
  });
});

describe("rates step", () => {
  const props = (state = completeDraft()) => ({ options: OPTIONS, initial: ratesFromState(state, OPTIONS), platforms: state.audience.platforms.map((p) => p.platform) });

  it("shows API choices, the saved price, and for a saved payout account only its last three digits", () => {
    render(<RatesStep {...props()} />);
    expect(screen.getByLabelText(/Instagram/)).toHaveValue("85,000");
    expect(screen.getByLabelText("Minimum booking")).toHaveValue("1-week");
    expect([...(screen.getByLabelText("Minimum booking") as HTMLSelectElement).options].map((o) => o.value)).toEqual(["1-week", "2-weeks", "1-month"]);
    expect([...(screen.getByLabelText("Revisions") as HTMLSelectElement).options].map((o) => o.textContent)).toContain("3 rounds of content revisions");
    expect(screen.getByLabelText("Payment terms")).toHaveValue("full_in_escrow");
    expect(screen.getByLabelText("MTN MoMo number")).toHaveValue("");
    expect(screen.getByText(/number ending 113 is saved/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/6\d{8}/);
  });

  it("offers the 50% wording as an informational choice but defaults a new application to full escrow", () => {
    render(<RatesStep {...props(applicationState({ audience: completeDraft().audience }))} />);
    expect(screen.getByLabelText("Payment terms")).toHaveValue("full_in_escrow");
    expect([...(screen.getByLabelText("Payment terms") as HTMLSelectElement).options].map((o) => o.value)).toContain("deposit_50_balance_on_delivery");
  });

  it("requires the payout number again and the confirmation, and enforces the API's minimum price", async () => {
    const user = userEvent.setup();
    render(<RatesStep {...props()} />);
    await user.clear(screen.getByLabelText(/Instagram/));
    await user.type(screen.getByLabelText(/Instagram/), "1000");
    await user.click(screen.getByRole("button", { name: /submit my profile/i }));
    expect(await screen.findByText(/Set at least 5,000 Frs/)).toBeInTheDocument();
    expect(screen.getByText(/9-digit Cameroon number/)).toBeInTheDocument();
    expect(screen.getByText("Please confirm your details are accurate.")).toBeInTheDocument();
    expect(submitApplicationAction).not.toHaveBeenCalled();
  });

  async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("MTN MoMo number"), "677 123 456");
    await user.click(screen.getByRole("checkbox", { name: /my details are accurate/i }));
    await user.click(screen.getByRole("button", { name: /submit my profile/i }));
  }

  it("submits rates and the confirmation together, and goes to the status page only after the API confirmed", async () => {
    submitApplicationAction.mockResolvedValue({ ok: true, value: completeDraft() });
    const user = userEvent.setup();
    render(<RatesStep {...props()} />);
    await fillAndSubmit(user);
    await waitFor(() => expect(submitApplicationAction).toHaveBeenCalledTimes(1));
    expect(submitApplicationAction.mock.calls[0]![0]).toEqual({
      rates: {
        prices: [{ platform: "instagram", priceXaf: 85000 }],
        minimumBooking: "1-week",
        deliverables: "1 reel",
        revisionsRounds: 2,
        usageRightsMonths: 6,
        depositTerms: "full_in_escrow",
        payoutAccounts: [{ method: "mtn_momo", number: "677 123 456" }],
      },
      confirmAccuracy: true,
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/for-creators/apply/submitted"));
  });

  it("a submit failure after the rates were saved says exactly that, and keeps the form for a retry", async () => {
    submitApplicationAction.mockResolvedValue({ ok: false, ratesSaved: true, error: { kind: "unavailable", requestId: null } });
    const user = userEvent.setup();
    render(<RatesStep {...props()} />);
    await fillAndSubmit(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(/saved, but the application was not submitted/);
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /submit my profile/i })).toBeEnabled();
  });

  it("an incomplete earlier step is reported with links to fix it", async () => {
    submitApplicationAction.mockResolvedValue({ ok: false, ratesSaved: true, error: { kind: "validation", fields: { bio: "is required" }, steps: ["profile", "rates"], message: null } });
    const user = userEvent.setup();
    render(<RatesStep {...props()} />);
    await fillAndSubmit(user);
    const link = await screen.findByRole("link", { name: /Step 1 \(About you\)/ });
    expect(link).toHaveAttribute("href", "/for-creators/apply/profile");
  });

  it("a double click on submit sends a single request", async () => {
    let finish: (value: unknown) => void = () => undefined;
    submitApplicationAction.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(<RatesStep {...props()} />);
    await user.type(screen.getByLabelText("MTN MoMo number"), "677 123 456");
    await user.click(screen.getByRole("checkbox", { name: /my details are accurate/i }));
    await user.dblClick(screen.getByRole("button", { name: /submit my profile/i }));
    expect(submitApplicationAction).toHaveBeenCalledTimes(1);
    finish({ ok: true, value: completeDraft() });
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  });

  it("two final submits fired in the same instant send one submission", async () => {
    let finish: (value: unknown) => void = () => undefined;
    submitApplicationAction.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    const { container } = render(<RatesStep {...props()} />);
    await user.type(screen.getByLabelText("MTN MoMo number"), "677 123 456");
    await user.click(screen.getByRole("checkbox", { name: /my details are accurate/i }));
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(submitApplicationAction).toHaveBeenCalledTimes(1);
    finish({ ok: true, value: completeDraft() });
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  });

  it("an ended session during submit says nothing was submitted and links to sign-in", async () => {
    submitApplicationAction.mockResolvedValue({ ok: false, ratesSaved: false, error: { kind: "unauthenticated" } });
    const user = userEvent.setup();
    render(<RatesStep {...props()} />);
    await fillAndSubmit(user);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/session has ended/i);
    expect(within(alert).getByRole("link", { name: "Sign in again" })).toBeInTheDocument();
  });

  it("Back saves valid rates first, and goes back without claiming a save when they are not valid", async () => {
    saveRatesAction.mockResolvedValue({ ok: true, value: completeDraft() });
    const user = userEvent.setup();
    const { unmount } = render(<RatesStep {...props()} />);
    await user.type(screen.getByLabelText("MTN MoMo number"), "677 123 456");
    await user.click(screen.getByRole("button", { name: /back/i }));
    await waitFor(() => expect(saveRatesAction).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/for-creators/apply/audience"));
    unmount();
    push.mockReset();
    saveRatesAction.mockReset();
    render(<RatesStep {...props()} />);
    await user.click(screen.getByRole("button", { name: /back/i })); // payout number missing: invalid, so not saved
    await waitFor(() => expect(push).toHaveBeenCalledWith("/for-creators/apply/audience"));
    expect(saveRatesAction).not.toHaveBeenCalled();
  });

  it("Back stays on the page and reports the failure if saving valid rates fails", async () => {
    saveRatesAction.mockResolvedValue({ ok: false, error: { kind: "unavailable", requestId: null } });
    const user = userEvent.setup();
    render(<RatesStep {...props()} />);
    await user.type(screen.getByLabelText("MTN MoMo number"), "677 123 456");
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nothing was saved");
    expect(push).not.toHaveBeenCalled();
  });
});

describe("application status page", () => {
  const withStatus = (status: "under_review" | "approved" | "rejected", extra: Record<string, unknown> = {}) =>
    completeDraft({ application: { id: "22222222-2222-4222-8222-222222222222", status, editable: false, createdAt: "2026-10-19T10:00:00.000Z", submittedAt: "2026-10-19T11:00:00.000Z", reviewedAt: status === "under_review" ? null : "2026-10-20T09:00:00.000Z", feedback: null }, canSubmit: false, nextStep: null, ...extra });

  it("under review: shows the real status and the saved profile, never a stored number", () => {
    render(<SubmittedView state={withStatus("under_review")} options={OPTIONS} />);
    expect(screen.getByRole("status")).toHaveTextContent(/Profile submitted/);
    expect(screen.getByText("Under review")).toBeInTheDocument();
    expect(screen.getByText("Beauty · Douala")).toBeInTheDocument();
    expect(screen.getByText(/MTN MoMo · ending 113/)).toBeInTheDocument();
    expect(screen.getByText("Beauty & Skincare")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/6\d{8}/);
    expect(document.body.textContent).not.toMatch(/message you on|contact you on/i);
  });

  it("approved: offers the dashboard", () => {
    render(<SubmittedView state={withStatus("approved")} options={OPTIONS} />);
    expect(screen.getByText(/has been approved/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Creator Dashboard" })).toHaveAttribute("href", "/creator/requests");
  });

  it("rejected: shows the reviewer's message and, when allowed, the way to apply again", () => {
    render(<SubmittedView state={withStatus("rejected", { canReapply: true, application: { id: "22222222-2222-4222-8222-222222222222", status: "rejected", editable: false, createdAt: "x", submittedAt: "y", reviewedAt: "z", feedback: { message: "Please add clearer content samples.", decidedAt: "z" } } })} options={OPTIONS} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Please add clearer content samples.");
    expect(screen.getByRole("button", { name: "Update and apply again" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Go to Creator Dashboard" })).not.toBeInTheDocument();
  });

  it("does not offer reapply when the API says it is not allowed", () => {
    render(<SubmittedView state={withStatus("rejected", { canReapply: false })} options={OPTIONS} />);
    expect(screen.queryByRole("button", { name: "Update and apply again" })).not.toBeInTheDocument();
  });

  it("reapply starts a new draft and returns to step 1; a failure is shown and nothing changes", async () => {
    reapplyAction.mockResolvedValueOnce({ ok: false, error: { kind: "unavailable", requestId: null } }).mockResolvedValueOnce({ ok: true, value: applicationState() });
    const user = userEvent.setup();
    render(<ReapplyButton />);
    await user.click(screen.getByRole("button", { name: "Update and apply again" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nothing was saved");
    expect(push).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Update and apply again" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/for-creators/apply/profile"));
  });
});
