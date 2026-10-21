import { describe, expect, it, vi } from "vitest";
import { ApiError, UpstreamContractError, UpstreamUnavailableError } from "@/lib/api/errors";
import { campaignFailureFrom, campaignFailureNotice } from "@/features/brand-campaigns/failure";

const api = (status: number, code: string, extra: { details?: { path: string; message: string }[]; retryAfterSeconds?: number } = {}) =>
  new ApiError({ status, code, message: `API says ${code} (pending_review)`, requestId: "req-1", ...extra });

describe("campaignFailureFrom", () => {
  it("401 is an ended session; other 403s are forbidden; an inactive brand gets the plain explanation", () => {
    expect(campaignFailureFrom(api(401, "unauthorized"))).toEqual({ kind: "unauthenticated" });
    expect(campaignFailureFrom(api(403, "forbidden"))).toMatchObject({ kind: "forbidden" });
    expect(campaignFailureFrom(api(403, "brand_not_active"))).toEqual({ kind: "conflict", code: "brand_not_active", message: "Your account must be active to do this." });
  });

  it("404 is 'not found' (a missing campaign and another brand's campaign look identical)", () => {
    expect(campaignFailureFrom(api(404, "not_found"))).toEqual({ kind: "not_found" });
  });

  it.each([
    ["campaign_not_draft", /already been submitted/],
    ["campaign_not_editable", /can't be edited/],
    ["campaign_not_deletable", /Only a draft can be deleted/],
    ["campaign_not_cancellable", /can't be cancelled/],
    ["campaign_has_active_offers", /Creators have already responded/],
  ])("409 %s becomes plain language without raw status names", (code, message) => {
    const failure = campaignFailureFrom(api(409, code));
    expect(failure).toMatchObject({ kind: "conflict", code, message: expect.stringMatching(message) });
    expect(JSON.stringify(failure)).not.toContain("pending_review");
  });

  it("an unknown 409 keeps the API's message", () => {
    expect(campaignFailureFrom(api(409, "something_new"))).toMatchObject({ kind: "conflict", message: "API says something_new (pending_review)" });
  });

  it("422 maps the API's details to the form's field names", () => {
    const failure = campaignFailureFrom(api(422, "budget_out_of_range", { details: [{ path: "body.budgetXaf", message: "must be between 50000 and 100000000" }] }));
    expect(failure).toEqual({ kind: "validation", fields: { budget: "must be between 50000 and 100000000" }, message: expect.stringContaining("budget_out_of_range") });
    const generic = campaignFailureFrom(api(422, "validation_failed", { details: [{ path: "body.title", message: "too short" }] }));
    expect(generic).toEqual({ kind: "validation", fields: { title: "too short" }, message: null });
  });

  it("429 carries the wait time; 5xx, outages and malformed answers are 'unavailable'", () => {
    expect(campaignFailureFrom(api(429, "rate_limited", { retryAfterSeconds: 90 }))).toEqual({ kind: "rate_limited", retryAfterSeconds: 90 });
    expect(campaignFailureFrom(api(500, "internal_error"))).toEqual({ kind: "unavailable", requestId: "req-1" });
    expect(campaignFailureFrom(new UpstreamUnavailableError("timeout"))).toEqual({ kind: "unavailable", requestId: null });
    expect(campaignFailureFrom(new UpstreamContractError())).toEqual({ kind: "unavailable", requestId: null });
  });

  it("an unexpected error is logged by name only and reported as unavailable", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(campaignFailureFrom(new Error("secret detail 677123456"))).toEqual({ kind: "unavailable", requestId: null });
    expect(JSON.stringify(spy.mock.calls)).not.toContain("secret detail");
  });
});

describe("what the brand is told", () => {
  it("every failed save says nothing was saved, or exactly what was", () => {
    expect(campaignFailureNotice({ kind: "unavailable", requestId: null }, "/x").text).toContain("Nothing was saved");
    expect(campaignFailureNotice({ kind: "validation", fields: {}, message: null }, "/x").text).toContain("Nothing was saved");
    const partial = campaignFailureNotice({ kind: "unavailable", requestId: null }, "/x", { savedDraft: true }).text;
    expect(partial).toContain("saved as a draft, but the campaign was not submitted");
    expect(partial).not.toContain("Nothing was saved");
  });

  it("an ended session links back to sign-in with the page to return to", () => {
    const notice = campaignFailureNotice({ kind: "unauthenticated" }, "/campaigns/new?draft=abc");
    expect(notice.text).toMatch(/session has ended.*not saved/);
    expect(notice.link).toEqual({ href: "/sign-in?next=%2Fcampaigns%2Fnew%3Fdraft%3Dabc&expired=1", label: "Sign in again" });
  });

  it("not found and conflicts point back to the campaign list", () => {
    expect(campaignFailureNotice({ kind: "not_found" }, "/x").link?.href).toBe("/brand/campaigns");
    expect(campaignFailureNotice({ kind: "conflict", code: "campaign_not_editable", message: "Already submitted." }, "/x").text).toContain("Nothing was changed");
  });
});
