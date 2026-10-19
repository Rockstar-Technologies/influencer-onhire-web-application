import { describe, expect, it, vi } from "vitest";
import { ApiError, UpstreamContractError, UpstreamUnavailableError } from "@/lib/api/errors";
import { offerFailureFrom, offerFailureNotice } from "@/features/offers/failure";

const api = (status: number, code: string, extra: { details?: { path: string; message: string }[]; retryAfterSeconds?: number } = {}) => new ApiError({ status, code, message: `API says ${code}`, requestId: "req-9", ...extra });
const BACK = { href: "/brand/offers", label: "Back" };

describe("offerFailureFrom", () => {
  it("401 ends the session; 403 is forbidden; an inactive account gets the plain message", () => {
    expect(offerFailureFrom(api(401, "unauthorized"))).toEqual({ kind: "unauthenticated" });
    expect(offerFailureFrom(api(403, "forbidden"))).toMatchObject({ kind: "forbidden" });
    expect(offerFailureFrom(api(403, "account_not_active"))).toMatchObject({ kind: "conflict" });
  });

  it("404 is plain 'not found' (another party's offer looks the same as a missing one)", () => {
    expect(offerFailureFrom(api(404, "not_found"))).toEqual({ kind: "not_found" });
  });

  it.each([
    ["hire_already_pending", /already have a pending request/],
    ["offer_not_pending", /already been answered/],
    ["offer_not_respondable", /your own application/],
    ["offer_not_cancellable", /Only a pending direct hire/],
    ["hire_expired", /has expired/],
    ["campaign_not_open", /no longer open/],
    ["creator_capacity_exceeded", /maximum number of overlapping/],
  ])("409 %s is explained in plain language", (code, message) => {
    const failure = offerFailureFrom(api(409, code));
    expect(failure).toMatchObject({ kind: "conflict", code });
    expect((failure as { message: string }).message).toMatch(message);
  });

  it("an unknown 409 falls back to the API's own message", () => {
    expect(offerFailureFrom(api(409, "something_new"))).toMatchObject({ kind: "conflict", message: "API says something_new" });
  });

  it("422 validation maps field paths; generic codes carry no extra message", () => {
    const failure = offerFailureFrom(api(422, "validation_failed", { details: [{ path: "body.location", message: "too short" }] }));
    expect(failure).toEqual({ kind: "validation", fields: { location: "too short" }, message: null });
    expect(offerFailureFrom(api(422, "duration_below_minimum"))).toMatchObject({ kind: "validation", message: "API says duration_below_minimum" });
  });

  it("429 keeps the wait time; 5xx and an unexpected 4xx are 'unavailable' with the request reference", () => {
    expect(offerFailureFrom(api(429, "rate_limited", { retryAfterSeconds: 120 }))).toEqual({ kind: "rate_limited", retryAfterSeconds: 120 });
    expect(offerFailureFrom(api(500, "internal_error"))).toEqual({ kind: "unavailable", requestId: "req-9" });
  });

  it("network, contract and unexpected errors are 'unavailable' and leak nothing", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(offerFailureFrom(new UpstreamUnavailableError("network"))).toEqual({ kind: "unavailable", requestId: null });
    expect(offerFailureFrom(new UpstreamContractError("shape"))).toEqual({ kind: "unavailable", requestId: null });
    expect(log).not.toHaveBeenCalled();
    expect(offerFailureFrom(new Error("secret internals"))).toEqual({ kind: "unavailable", requestId: null });
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret internals");
    log.mockRestore();
  });
});

describe("offerFailureNotice", () => {
  it("every notice says nothing was changed or sent", () => {
    for (const failure of [{ kind: "forbidden", message: "No." }, { kind: "not_found" }, { kind: "conflict", code: "x", message: "Nope." }, { kind: "validation", fields: {}, message: null }, { kind: "rate_limited", retryAfterSeconds: null }, { kind: "unavailable", requestId: null }] as const) {
      expect(offerFailureNotice(failure, "/brand/offers", BACK).text, failure.kind).toMatch(/Nothing was (changed|sent)/);
    }
  });

  it("an ended session links to sign-in and back to the page", () => {
    expect(offerFailureNotice({ kind: "unauthenticated" }, "/creator/requests", BACK).link).toEqual({ href: "/sign-in?next=%2Fcreator%2Frequests&expired=1", label: "Sign in again" });
  });

  it("a duplicate pending hire points to the brand's hire list", () => {
    expect(offerFailureNotice({ kind: "conflict", code: "hire_already_pending", message: "x" }, "/x", BACK).link?.href).toBe("/brand/offers");
  });

  it("rate limiting says how long to wait", () => {
    expect(offerFailureNotice({ kind: "rate_limited", retryAfterSeconds: 130 }, "/x", BACK).text).toMatch(/about 3 minute/);
  });
});
