import { describe, expect, it } from "vitest";
import {
  audienceFromState,
  audienceToApi,
  fieldErrorsFromDetails,
  profileFromState,
  profileToApi,
  ratesFromState,
  ratesToApi,
  revisionsLabel,
  splitErrorPath,
  stepsWithErrors,
  totalFollowers,
  usageRightsLabel,
} from "@/features/creator-application/mapping";
import { OPTIONS, applicationState, completeDraft } from "../helpers";

describe("options come from the API, not from hard-coded display names", () => {
  it("the captured option lists carry the slugs, ids and codes the API validates against", () => {
    expect(OPTIONS.niches.find((n) => n.name === "Sports & Fitness")?.slug).toBe("sports-fitness");
    expect(OPTIONS.cities.find((c) => c.name === "Yaoundé")?.slug).toBe("yaounde");
    expect(OPTIONS.brandFit[0]).toEqual({ id: expect.any(Number), name: "Beauty & Skincare" });
    expect(OPTIONS.minimumBookingOptions.map((o) => o.code)).toEqual(["1-week", "2-weeks", "1-month"]);
    expect(OPTIONS.limits.minPricePerPlatformXaf).toBe(5000);
  });
});

describe("step 1: profile (fullName becomes displayName, niche and city become slugs)", () => {
  it("fills the form from the saved draft and keeps the optional fields the wizard does not collect", () => {
    const { form, preserved } = profileFromState(completeDraft());
    expect(form).toEqual({ displayName: "Amina Beauty", primaryNiche: "beauty", city: "douala", bio: expect.stringContaining("creator bio") });
    expect(preserved).toEqual({ otherNiches: ["fashion"], photoFileId: null, language: "bilingual", contentStyle: "Short reels", engagementRatePct: 4.5 });
  });

  it("starts empty for a new application", () => {
    expect(profileFromState(applicationState()).form).toEqual({ displayName: "", primaryNiche: "", city: "", bio: "" });
  });

  it("sends the API's field names, trims text, and re-sends preserved values so saving a step cannot erase them", () => {
    const { form, preserved } = profileFromState(completeDraft());
    expect(profileToApi({ ...form, displayName: "  Amina B.  ", bio: `  ${form.bio}  ` }, preserved)).toEqual({
      displayName: "Amina B.",
      primaryNiche: "beauty",
      otherNiches: ["fashion"],
      city: "douala",
      bio: form.bio,
      photoFileId: null,
      language: "bilingual",
      contentStyle: "Short reels",
      engagementRatePct: 4.5,
    });
  });

  it("never repeats the primary niche among the other niches (the API rejects that)", () => {
    const { form, preserved } = profileFromState(completeDraft());
    expect(profileToApi({ ...form, primaryNiche: "fashion" }, preserved).otherNiches).toEqual([]);
  });

  it("never sends a photo as data: only a server-issued file id (or null)", () => {
    const body = profileToApi(...Object.values(profileFromState(completeDraft())) as Parameters<typeof profileToApi>);
    expect(JSON.stringify(body)).not.toMatch(/data:image|photoDataUrl|base64/);
    expect(body.photoFileId).toBeNull();
  });
});

describe("step 2: audience (followers become numbers, years become numbers, brand fit becomes ids)", () => {
  it("restores platform rows, collaborations and brand-fit ids", () => {
    const form = audienceFromState(completeDraft(), OPTIONS);
    expect(form.platforms.instagram).toEqual({ on: true, handle: "@amina", followers: "25,000" });
    expect(form.platforms.tiktok).toEqual({ on: false, handle: "", followers: "" });
    expect(form.collaborations).toEqual([{ brand: "MTN", description: "", year: "2024" }]);
    expect(form.brandFit).toEqual([1, 2]);
  });

  it("builds the request: platform codes, integer followers, null for an empty description, numeric year, brand-fit ids", () => {
    const form = audienceFromState(completeDraft(), OPTIONS);
    form.platforms.tiktok = { on: true, handle: " @amina.tok ", followers: "1,200" };
    form.collaborations.push({ brand: " Orange ", description: " Ambassador ", year: " 2023 " });
    expect(audienceToApi(form, OPTIONS)).toEqual({
      platforms: [
        { platform: "instagram", handle: "@amina", followers: 25000 },
        { platform: "tiktok", handle: "@amina.tok", followers: 1200 },
      ],
      collaborations: [
        { brandName: "MTN", description: null, year: 2024 },
        { brandName: "Orange", description: "Ambassador", year: 2023 },
      ],
      brandFit: [1, 2],
    });
  });

  it("leaves switched-off platforms out and totals followers across the active ones", () => {
    const form = audienceFromState(completeDraft(), OPTIONS);
    form.platforms.youtube = { on: false, handle: "@ignored", followers: "999,999" };
    expect(audienceToApi(form, OPTIONS).platforms).toHaveLength(1);
    expect(totalFollowers(form, OPTIONS)).toBe(25000);
  });
});

describe("step 3: rates (price becomes priceXaf; choices become codes and numbers)", () => {
  it("fills defaults for a new application, including the approved 100% escrow wording", () => {
    const form = ratesFromState(applicationState(), OPTIONS);
    expect(form.depositTerms).toBe("full_in_escrow");
    expect(form.minimumBooking).toBe("2-weeks");
    expect(form.revisionsRounds).toBe(2);
    expect(form.usageRightsMonths).toBe(6);
    expect(form.payout.mtn_momo.on).toBe(true);
    expect(form.payout.orange_money.on).toBe(false);
  });

  it("restores saved values; saved payout accounts show only the last three digits and need the number again", () => {
    const form = ratesFromState(completeDraft(), OPTIONS);
    expect(form.prices.instagram).toBe("85,000");
    expect(form.minimumBooking).toBe("1-week");
    expect(form.payout.mtn_momo).toEqual({ on: true, number: "", savedLast3: "113" });
    expect(form.payout.orange_money.on).toBe(false);
  });

  it("builds the request with priceXaf integers, codes and numbers, one price per saved platform, and only switched-on payout accounts", () => {
    const form = ratesFromState(completeDraft(), OPTIONS);
    form.prices.instagram = "90,000";
    form.payout.mtn_momo.number = "677 123 456";
    expect(ratesToApi(form, ["instagram"])).toEqual({
      prices: [{ platform: "instagram", priceXaf: 90000 }],
      minimumBooking: "1-week",
      deliverables: "1 reel",
      revisionsRounds: 2,
      usageRightsMonths: 6,
      depositTerms: "full_in_escrow",
      payoutAccounts: [{ method: "mtn_momo", number: "677 123 456" }],
    });
  });

  it("keeps the 50% deposit wording selectable but never makes it the default (funding is 100% escrow)", () => {
    expect(ratesFromState(applicationState(), OPTIONS).depositTerms).toBe("full_in_escrow");
    expect(OPTIONS.depositTerms.map((o) => o.value)).toContain("deposit_50_balance_on_delivery");
  });

  it("labels the numeric choices with the wording the wizard always used", () => {
    expect(revisionsLabel(1)).toBe("1 round of content revisions");
    expect(revisionsLabel(3)).toBe("3 rounds of content revisions");
    expect(usageRightsLabel(12)).toBe("Content usage rights: 12 months");
  });
});

describe("API error paths", () => {
  it("splits save errors (body.field) and submit errors (step.field)", () => {
    expect(splitErrorPath("body.bio")).toEqual({ step: null, field: "bio" });
    expect(splitErrorPath("body.platforms")).toEqual({ step: null, field: "platforms" });
    expect(splitErrorPath("profile.bio")).toEqual({ step: "profile", field: "bio" });
    expect(splitErrorPath("rates.prices.instagram")).toEqual({ step: "rates", field: "prices.instagram" });
  });

  it("collects the first message per field and can limit to one step", () => {
    const details = [
      { path: "profile.bio", message: "is required" },
      { path: "profile.bio", message: "second" },
      { path: "rates.prices.instagram", message: "is required" },
    ];
    expect(fieldErrorsFromDetails(details)).toEqual({ bio: "is required", "prices.instagram": "is required" });
    expect(fieldErrorsFromDetails(details, "rates")).toEqual({ "prices.instagram": "is required" });
  });

  it("lists the steps that have problems, in wizard order", () => {
    expect(stepsWithErrors([{ path: "rates.prices.x" }, { path: "profile.bio" }, { path: "body.city" }])).toEqual(["profile", "rates"]);
  });
});
