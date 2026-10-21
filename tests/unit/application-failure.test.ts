import { describe, expect, it, vi } from "vitest";
import { ApiError, UpstreamContractError, UpstreamUnavailableError } from "@/lib/api/errors";
import { wizardFailureFrom } from "@/features/creator-application/failure";
import { failureNotice, fieldError } from "@/features/creator-application/messages";

const api = (status: number, code: string, extra: { details?: { path: string; message: string }[]; retryAfterSeconds?: number } = {}) =>
  new ApiError({ status, code, message: `message for ${code}`, requestId: "req-1", ...extra });

describe("wizardFailureFrom", () => {
  it("maps a 401 to an ended session", () => {
    expect(wizardFailureFrom(api(401, "unauthorized"))).toEqual({ kind: "unauthenticated" });
  });

  it("maps a 403 to forbidden with the API's message", () => {
    expect(wizardFailureFrom(api(403, "account_not_active"))).toEqual({ kind: "forbidden", message: "message for account_not_active" });
  });

  it.each(["application_not_editable", "no_open_application", "already_submitted"])("maps %s (409) to not editable", (code) => {
    expect(wizardFailureFrom(api(409, code)).kind).toBe("not_editable");
  });

  it("maps audience_required (409) to a prerequisite on step 2", () => {
    expect(wizardFailureFrom(api(409, "audience_required"))).toMatchObject({ kind: "prerequisite", step: "audience" });
  });

  it("maps a rejected save to field errors keyed by the API's field names", () => {
    const failure = wizardFailureFrom(api(422, "validation_failed", { details: [{ path: "body.bio", message: "too short" }, { path: "body.city", message: "unknown" }] }), "profile");
    expect(failure).toEqual({ kind: "validation", fields: { bio: "too short", city: "unknown" }, steps: [], message: null });
  });

  it("maps an incomplete submit to field errors per step", () => {
    const failure = wizardFailureFrom(
      api(422, "application_incomplete", { details: [{ path: "profile.bio", message: "is required" }, { path: "rates.prices.instagram", message: "is required" }] }),
      "rates",
    );
    expect(failure).toMatchObject({ kind: "validation", fields: { "prices.instagram": "is required" }, steps: ["profile", "rates"] });
  });

  it.each(["followers_below_minimum", "price_below_minimum", "prices_must_match_platforms", "invalid_photo"])("shows the applicant-facing message of %s", (code) => {
    expect(wizardFailureFrom(api(422, code, { details: [] }))).toMatchObject({ kind: "validation", message: `message for ${code}` });
  });

  it("maps a 429 with the wait time", () => {
    expect(wizardFailureFrom(api(429, "rate_limited", { retryAfterSeconds: 120 }))).toEqual({ kind: "rate_limited", retryAfterSeconds: 120 });
  });

  it.each([api(500, "internal_error"), api(503, "request_timeout"), api(404, "profile_not_found")])("treats other API errors as unavailable", (error) => {
    expect(wizardFailureFrom(error)).toEqual({ kind: "unavailable", requestId: "req-1" });
  });

  it("treats outages and malformed answers as unavailable, and unknown errors too, without leaking them", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(wizardFailureFrom(new UpstreamUnavailableError("network"))).toEqual({ kind: "unavailable", requestId: null });
    expect(wizardFailureFrom(new UpstreamContractError())).toEqual({ kind: "unavailable", requestId: null });
    expect(wizardFailureFrom(new Error("secret internal detail"))).toEqual({ kind: "unavailable", requestId: null });
    expect(JSON.stringify(spy.mock.calls)).not.toContain("secret internal detail");
  });
});

describe("what the person is told", () => {
  it("every failed save says nothing was saved (or exactly what was)", () => {
    expect(failureNotice({ kind: "unavailable", requestId: null }, "/x").text).toContain("Nothing was saved");
    expect(failureNotice({ kind: "validation", fields: {}, steps: [], message: null }, "/x").text).toContain("Nothing was saved");
    expect(failureNotice({ kind: "rate_limited", retryAfterSeconds: null }, "/x").text).toContain("Nothing was saved");
    expect(failureNotice({ kind: "unavailable", requestId: null }, "/x", { ratesSaved: true }).text).toContain("were saved, but the application was not submitted");
    expect(failureNotice({ kind: "unavailable", requestId: null }, "/x", { ratesSaved: true }).text).not.toContain("Nothing was saved");
  });

  it("an ended session says so and links back to sign-in with the page to return to", () => {
    const notice = failureNotice({ kind: "unauthenticated" }, "/for-creators/apply/rates");
    expect(notice.text).toContain("session has ended");
    expect(notice.text).toContain("not saved");
    expect(notice.link).toEqual({ href: "/sign-in?next=%2Ffor-creators%2Fapply%2Frates&expired=1", label: "Sign in again" });
  });

  it("a locked application points to its status page", () => {
    expect(failureNotice({ kind: "not_editable", message: "x" }, "/x").link?.href).toBe("/for-creators/apply/submitted");
  });

  it("shows the request reference when there is one", () => {
    expect(failureNotice({ kind: "unavailable", requestId: "req-9" }, "/x").text).toContain("req-9");
  });

  it("fieldError finds exact and nested keys", () => {
    expect(fieldError({ platforms: "a" }, "platforms")).toBe("a");
    expect(fieldError({ "platforms.0.handle": "b" }, "platforms")).toBe("b");
    expect(fieldError({ other: "c" }, "platforms")).toBeUndefined();
  });
});
