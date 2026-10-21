import { describe, expect, it } from "vitest";
import {
  engagementApiToForm,
  engagementFormToApi,
  fromNullable,
  knownPermissions,
  parseAccountType,
  parseAdminRole,
  parseAgeRange,
  parseDepositTerms,
  parseLanguage,
  parseMinimumBooking,
  parsePaymentMethod,
  parseRevisionRounds,
  parseUsageRightsMonths,
  toNullable,
} from "@/lib/domain/mappers";

describe("roles and account types", () => {
  it("maps the legacy 'influencer' spelling to creator and accepts the API values", () => {
    expect(parseAccountType("influencer")).toBe("creator");
    expect(parseAccountType("creator")).toBe("creator");
    expect(parseAccountType("brand")).toBe("brand");
  });

  it.each(["admin", "Influencer", "CREATOR", "", null, undefined, 1, ["creator"]])("does not guess for %j", (value) => {
    expect(parseAccountType(value)).toBeNull();
  });

  it("maps admin team roles from codes and from the labels the invite form used", () => {
    expect(parseAdminRole("finance")).toBe("finance");
    expect(parseAdminRole("Super Admin")).toBe("super_admin");
    expect(parseAdminRole("Campaign Manager")).toBe("campaign_manager");
    expect(parseAdminRole("Support Agent")).toBe("support_agent");
    for (const bad of ["Owner", "super admin", "", null, undefined, 3]) expect(parseAdminRole(bad)).toBeNull();
  });

  it("keeps only permissions this app knows and drops the rest instead of trusting them", () => {
    expect(knownPermissions(["payments.view", "invented.power", "users.view", ""])).toEqual(["payments.view", "users.view"]);
    expect(knownPermissions([])).toEqual([]);
  });
});

describe("payment methods", () => {
  it("accepts codes and the display labels older screens used", () => {
    expect(parsePaymentMethod("mtn_momo")).toBe("mtn_momo");
    expect(parsePaymentMethod("MTN MoMo")).toBe("mtn_momo");
    expect(parsePaymentMethod("Orange Money")).toBe("orange_money");
  });

  it.each(["Bank transfer", "mtn", "MTN MOMO", "", null, undefined, 5])("rejects %j (bank transfer is not an API method)", (value) => {
    expect(parsePaymentMethod(value)).toBeNull();
  });
});

describe("audience and form enumerations", () => {
  it("maps the display age range '45+' to the API code and keeps the others", () => {
    expect(parseAgeRange("45+")).toBe("45-plus");
    expect(parseAgeRange("45-plus")).toBe("45-plus");
    expect(parseAgeRange("18-24")).toBe("18-24");
    for (const bad of ["45", "45 plus", "55+", "18–24", "", null]) expect(parseAgeRange(bad)).toBeNull();
  });

  it("maps language labels and codes", () => {
    expect(parseLanguage("Bilingual")).toBe("bilingual");
    expect(parseLanguage("french")).toBe("french");
    expect(parseLanguage("Spanish")).toBeNull();
  });

  it("maps the campaign engagement choice to the API percentage (null = no minimum)", () => {
    expect(engagementFormToApi("any")).toBeNull();
    expect(engagementFormToApi("")).toBeNull();
    expect(engagementFormToApi("3")).toBe(3);
    expect(engagementFormToApi("5")).toBe(5);
    expect(engagementFormToApi(7)).toBe(7);
    for (const bad of ["4", "10", "abc", "3%", NaN, {}]) expect(engagementFormToApi(bad)).toBeUndefined();
  });

  it("maps an API percentage back to the form choice", () => {
    expect(engagementApiToForm(null)).toBe("any");
    expect(engagementApiToForm(undefined)).toBe("any");
    expect(engagementApiToForm(3)).toBe("3");
    expect(engagementApiToForm(7)).toBe("7");
    expect(engagementApiToForm(4)).toBe("any");
  });

  it("maps the wizard's sentences to the API's codes and numbers", () => {
    expect(parseMinimumBooking("1 week")).toBe("1-week");
    expect(parseMinimumBooking("2 weeks")).toBe("2-weeks");
    expect(parseMinimumBooking("1 month")).toBe("1-month");
    expect(parseMinimumBooking("1-week")).toBe("1-week");
    expect(parseMinimumBooking("5 days")).toBeNull();
    expect(parseRevisionRounds("1 round of content revisions")).toBe(1);
    expect(parseRevisionRounds("3 rounds of content revisions")).toBe(3);
    expect(parseRevisionRounds(2)).toBe(2);
    expect(parseRevisionRounds("4 rounds of content revisions")).toBeNull();
    expect(parseUsageRightsMonths("Content usage rights: 12 months")).toBe(12);
    expect(parseUsageRightsMonths(3)).toBe(3);
    expect(parseUsageRightsMonths("Content usage rights: 9 months")).toBeNull();
    expect(parseDepositTerms("Full amount held in escrow until delivery")).toBe("full_in_escrow");
    expect(parseDepositTerms("50% deposit, balance on delivery")).toBe("deposit_50_balance_on_delivery");
    expect(parseDepositTerms("full_in_escrow")).toBe("full_in_escrow");
    expect(parseDepositTerms("Pay later")).toBeNull();
  });
});

describe("nullable API fields", () => {
  it("converts between the API's null and the UI's undefined without touching real values", () => {
    expect(fromNullable(null)).toBeUndefined();
    expect(fromNullable("x")).toBe("x");
    expect(fromNullable(0)).toBe(0);
    expect(toNullable(undefined)).toBeNull();
    expect(toNullable(null)).toBeNull();
    expect(toNullable("")).toBe("");
    expect(toNullable(0)).toBe(0);
  });
});
