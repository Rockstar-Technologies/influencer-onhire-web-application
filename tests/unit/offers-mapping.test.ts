import { describe, expect, it } from "vitest";
import { HIRE_DURATIONS, durationsAtLeast } from "@/features/offers/durations";
import { hireAnswerBy, hireErrorsFromDetails, hireToApi, initialHireValues, isCalendarDate, offerKind, startDateProblem, validateHireForm } from "@/features/offers/mapping";
import type { HireFormValues } from "@/features/offers/mapping";
import { hireCreator, invitationView, offerView } from "../helpers";

const VALUES: HireFormValues = { fullName: " Jane Brand ", location: "Douala, Cameroon", socialHandle: "acme", promotion: " A new snack ", platform: "tiktok", paymentMethod: "mtn_momo", duration: "1-month" };

describe("hireToApi", () => {
  it("sends exactly the API's fields, trimmed, with the handle normalised, and never a price, status, brand or date", () => {
    expect(hireToApi("kevin.fitness", VALUES)).toEqual({
      creator: "kevin.fitness",
      platform: "tiktok",
      duration: "1-month",
      paymentMethod: "mtn_momo",
      contactName: "Jane Brand",
      location: "Douala, Cameroon",
      socialHandle: "@acme",
      promotion: "A new snack",
    });
  });

  it("leaves out empty optional fields instead of sending empty strings", () => {
    const body = hireToApi("kevin.fitness", { ...VALUES, socialHandle: "  ", promotion: "" });
    expect(body).not.toHaveProperty("socialHandle");
    expect(body).not.toHaveProperty("promotion");
  });

  it("keeps a handle that already starts with @", () => {
    expect(hireToApi("kevin.fitness", { ...VALUES, socialHandle: "@acme" }).socialHandle).toBe("@acme");
  });
});

describe("initialHireValues", () => {
  it("starts from the creator's first platform and payment method, and a duration that meets the minimum booking", () => {
    expect(initialHireValues(hireCreator())).toMatchObject({ platform: "tiktok", paymentMethod: "mtn_momo", duration: "1-month" });
    expect(initialHireValues(hireCreator({ minimumBooking: { code: "2-months", label: "2 months", days: 60 } })).duration).toBe("2-months");
  });
});

describe("validateHireForm", () => {
  const creator = hireCreator();
  it("accepts a complete valid form", () => {
    expect(validateHireForm(VALUES, creator)).toEqual({});
  });

  it("reports each problem on its own field", () => {
    const errors = validateHireForm({ ...VALUES, fullName: "J", location: "", socialHandle: "no spaces allowed", promotion: "x".repeat(501), platform: "youtube", paymentMethod: "bank", duration: "1-week" }, hireCreator({ minimumBooking: { code: "2-weeks", label: "2 weeks", days: 14 } }));
    expect(Object.keys(errors).sort()).toEqual(["duration", "fullName", "location", "paymentMethod", "platform", "promotion", "socialHandle"]);
  });

  it("a duration shorter than the creator's minimum booking is refused", () => {
    expect(validateHireForm({ ...VALUES, duration: "1-week" }, hireCreator({ minimumBooking: { code: "1-month", label: "1 month", days: 30 } })).duration).toMatch(/at least 1 month/);
  });
});

describe("durations", () => {
  it("only offers durations at least as long as the minimum booking", () => {
    expect(durationsAtLeast(14).map((d) => d.value)).toEqual(["2-weeks", "1-month", "2-months", "3-months-plus"]);
    expect(durationsAtLeast(0)).toHaveLength(HIRE_DURATIONS.length);
    expect(durationsAtLeast(1000)).toEqual([]);
  });
});

describe("hireErrorsFromDetails", () => {
  it("maps the API's body paths onto the form's fields; unknown paths become a form-level message", () => {
    expect(hireErrorsFromDetails([{ path: "body.contactName", message: "too short" }, { path: "body.duration", message: "below minimum" }, { path: "body.creator", message: "bad" }, { path: "body.contactName", message: "second" }])).toEqual({ fullName: "too short", duration: "below minimum", form: "bad" });
  });
});

describe("reading an offer", () => {
  it("origin and initiator decide what an offer is", () => {
    expect(offerKind(offerView())).toBe("direct_hire");
    expect(offerKind(invitationView())).toBe("invitation");
    expect(offerKind(invitationView({ initiator: "creator" }))).toBe("application");
  });

  it("only a pending direct hire has an answer-by date: created + 7 days", () => {
    const created = "2026-10-01T10:00:00.000Z";
    expect(hireAnswerBy(offerView({ createdAt: created }))?.toISOString()).toBe("2026-10-08T10:00:00.000Z");
    expect(hireAnswerBy(offerView({ createdAt: created, status: "accepted" }))).toBeNull();
    expect(hireAnswerBy(invitationView({ createdAt: created }))).toBeNull();
    expect(hireAnswerBy(offerView({ createdAt: "not a date" }))).toBeNull();
  });
});

describe("start date (accepting a hire)", () => {
  const today = "2026-10-19";
  it("is optional", () => expect(startDateProblem("", today)).toBeNull());
  it("accepts today and a date up to a year ahead", () => {
    expect(startDateProblem("2026-10-19", today)).toBeNull();
    expect(startDateProblem("2027-10-19", today)).toBeNull();
  });
  it("refuses the past, more than a year ahead and impossible dates", () => {
    expect(startDateProblem("2026-10-18", today)).toMatch(/past/);
    expect(startDateProblem("2027-10-20", today)).toMatch(/year/);
    expect(startDateProblem("2026-02-30", today)).toMatch(/real date/);
    expect(startDateProblem("tomorrow", today)).toMatch(/real date/);
  });
  it("isCalendarDate rejects roll-overs", () => {
    expect(isCalendarDate("2026-02-30")).toBe(false);
    expect(isCalendarDate("2026-02-28")).toBe(true);
  });
});
