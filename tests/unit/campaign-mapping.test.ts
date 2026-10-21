import { describe, expect, it } from "vitest";
import {
  EMPTY_CAMPAIGN_FORM,
  campaignDays,
  campaignToApi,
  campaignToForm,
  fieldErrorsFromDetails,
  todayISO,
  validateCampaignForm,
} from "@/features/brand-campaigns/mapping";
import type { CampaignForm } from "@/features/brand-campaigns/mapping";
import { CAMPAIGN_OPTIONS, campaignView } from "../helpers";

const FORM: CampaignForm = {
  title: "  Summer Glow Launch  ",
  niche: "beauty",
  budget: "500000",
  startDate: "2031-03-01",
  endDate: "2031-03-31",
  deliverables: "  1 story + 2 TikToks  ",
  minEngagement: "5",
  ageRanges: ["18-24", "45-plus"],
  cities: ["douala", "yaounde"],
  interests: ["food-travel"],
};

describe("form to API", () => {
  it("sends the API's field names: slugs, whole-XAF budget as a number, engagement as a percentage, codes for age ranges", () => {
    expect(campaignToApi(FORM)).toEqual({
      title: "Summer Glow Launch",
      niche: "beauty",
      budgetXaf: 500000,
      startDate: "2031-03-01",
      endDate: "2031-03-31",
      deliverables: "1 story + 2 TikToks",
      minEngagementPct: 5,
      cities: ["douala", "yaounde"],
      interests: ["food-travel"],
      ageRanges: ["18-24", "45-plus"],
      imageFileIds: [],
    });
  });

  it("'no minimum' becomes null, never 0 or the word 'any'", () => {
    expect(campaignToApi({ ...FORM, minEngagement: "any" }).minEngagementPct).toBeNull();
  });

  it("never attaches images (there is no upload) and never carries an owner, status or reviewer field", () => {
    const body = campaignToApi(FORM) as Record<string, unknown>;
    expect(body.imageFileIds).toEqual([]);
    for (const key of ["brandId", "status", "reviewedBy", "reviewNote", "id"]) expect(body).not.toHaveProperty(key);
  });
});

describe("API to form", () => {
  it("restores a saved draft", () => {
    expect(campaignToForm(campaignView())).toEqual({
      title: "Summer Glow Launch",
      niche: "beauty",
      budget: "500000",
      startDate: "2031-03-01",
      endDate: "2031-03-31",
      deliverables: "1 story + 2 TikToks + 1 YouTube mention",
      minEngagement: "5",
      ageRanges: ["45-plus"],
      cities: ["douala"],
      interests: ["beauty-skincare"],
    });
  });

  it("a campaign without a minimum engagement and without targeting gives an empty refinement", () => {
    const form = campaignToForm(campaignView({ minEngagement: null, cities: [], interests: [], ageRanges: [] }));
    expect(form).toMatchObject({ minEngagement: "any", cities: [], interests: [], ageRanges: [] });
  });

  it("round-trips: what the API holds is what the form would send back", () => {
    const view = campaignView();
    const body = campaignToApi(campaignToForm(view));
    expect(body).toMatchObject({ title: view.title, niche: "beauty", budgetXaf: view.budgetXaf, minEngagementPct: 5, cities: ["douala"], ageRanges: ["45-plus"] });
  });
});

describe("API errors to form fields", () => {
  it("maps the API's names back to the form's", () => {
    const errors = fieldErrorsFromDetails([
      { path: "body.budgetXaf", message: "must be between 50000 and 100000000" },
      { path: "body.minEngagementPct", message: "x" },
      { path: "body.endDate", message: "window" },
      { path: "body.cities.0", message: "unknown city" },
      { path: "body.title", message: "too short" },
      { path: "body.title", message: "second" },
    ]);
    expect(errors).toEqual({ budget: "must be between 50000 and 100000000", minEngagement: "x", endDate: "window", cities: "unknown city", title: "too short" });
  });

  it("an unknown or file-related path becomes a general message", () => {
    expect(fieldErrorsFromDetails([{ path: "body.imageFileIds", message: "no uploads" }])).toEqual({ form: "no uploads" });
    expect(fieldErrorsFromDetails([{ path: "body.somethingNew", message: "?" }])).toEqual({ form: "?" });
  });
});

describe("local validation uses the API's own limits", () => {
  const today = "2030-06-15";
  const valid = { ...FORM, startDate: "2030-06-20", endDate: "2030-07-20" };
  const check = (patch: Partial<CampaignForm>) => validateCampaignForm({ ...valid, ...patch }, CAMPAIGN_OPTIONS, today);

  it("accepts a complete form", () => expect(check({})).toEqual({}));
  it("requires the six required fields", () => {
    expect(Object.keys(validateCampaignForm(EMPTY_CAMPAIGN_FORM, CAMPAIGN_OPTIONS, today)).sort()).toEqual(["budget", "deliverables", "endDate", "niche", "startDate", "title"]);
  });
  it.each([
    ["49999", /minimum budget is 50,000/],
    ["100000001", /maximum budget is 100,000,000/],
    ["0", /Enter your budget/],
    ["12ab", /Enter your budget/],
  ])("budget %s", (budget, message) => expect(check({ budget }).budget).toMatch(message));
  it("title bounds (3 to 80) and deliverables bounds (10 to 1000)", () => {
    expect(check({ title: "ab" }).title).toBeDefined();
    expect(check({ title: "x".repeat(81) }).title).toMatch(/under 80/);
    expect(check({ deliverables: "short" }).deliverables).toBeDefined();
    expect(check({ deliverables: "x".repeat(1001) }).deliverables).toMatch(/under 1000/);
  });
  it("dates: not in the past, end not before start, at most 365 days, real calendar dates", () => {
    expect(check({ startDate: "2030-06-14" }).startDate).toMatch(/past/);
    expect(check({ startDate: "2030-06-15" }).startDate).toBeUndefined();
    expect(check({ endDate: "2030-06-19" }).endDate).toMatch(/after the start/);
    expect(check({ endDate: "2031-06-20" }).endDate).toMatch(/up to 365/);
    expect(check({ startDate: "2030-02-30" }).startDate).toMatch(/Pick a start date/);
    expect(check({ startDate: "" }).startDate).toBeDefined();
  });
  it("follows a different platform limit when the API reports one", () => {
    const errors = validateCampaignForm({ ...valid, budget: "60000" }, { limits: { budgetMinXaf: 75000, budgetMaxXaf: 90000 } }, today);
    expect(errors.budget).toMatch(/minimum budget is 75,000/);
  });
});

describe("dates", () => {
  it("counts the days of a campaign inclusively", () => {
    expect(campaignDays("2031-03-01", "2031-03-31")).toBe(31);
    expect(campaignDays("2031-03-01", "2031-03-01")).toBe(1);
    expect(campaignDays("2031-03-02", "2031-03-01")).toBeNull();
    expect(campaignDays("bad", "2031-03-01")).toBeNull();
  });
  it("todayISO gives a calendar date and can be shifted", () => {
    const now = new Date(2030, 5, 15, 12);
    expect(todayISO(0, now)).toBe("2030-06-15");
    expect(todayISO(-1, now)).toBe("2030-06-14");
  });
});
