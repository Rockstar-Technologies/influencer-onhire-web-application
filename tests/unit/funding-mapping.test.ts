import { describe, expect, it } from "vitest";
import { FUNDING_STATUS } from "@/lib/api/schemas";
import { ApiError, UpstreamContractError, UpstreamUnavailableError } from "@/lib/api/errors";
import { fundFailureFrom, fundFailureNotice } from "@/features/funding/failure";
import { fundErrorsFromDetails, fundToApi, fundingMessage, isUnsettled, newFundingKey, normalizePayerPhone, validateFundForm } from "@/features/funding/mapping";
import { refreshFundingInputSchema, startFundingInputSchema } from "@/features/funding/schemas";
import { OFFER_ID, brandPayment, fundedView, fundingView } from "../helpers";

describe("payer number and form", () => {
  it("normalises +237, spaces and dashes to the 9 digits the API wants", () => {
    for (const typed of ["677123456", "677 123 456", "+237 677-123-456", "237677123456", " 677123456 "]) expect(normalizePayerPhone(typed.trim())).toBe("677123456");
  });

  it("accepts a valid method and number; reports each problem on its own field", () => {
    expect(validateFundForm({ paymentMethod: "mtn_momo", payerPhone: "677 123 456" })).toEqual({});
    expect(validateFundForm({ paymentMethod: "orange_money", payerPhone: "+237699000111" })).toEqual({});
    expect(Object.keys(validateFundForm({ paymentMethod: "Bank transfer", payerPhone: "12345" })).sort()).toEqual(["payerPhone", "paymentMethod"]);
    for (const bad of ["", "577123456", "67712345", "6771234567", "abc"]) expect(validateFundForm({ paymentMethod: "mtn_momo", payerPhone: bad }).payerPhone, bad).toBeTruthy();
  });

  it("the request body has exactly the method and the normalised number: never an amount, status, provider or id", () => {
    const body = fundToApi({ paymentMethod: "mtn_momo", payerPhone: "+237 677 123 456" });
    expect(body).toEqual({ paymentMethod: "mtn_momo", payerPhone: "677123456" });
    expect(Object.keys(body).sort()).toEqual(["payerPhone", "paymentMethod"]);
  });

  it("maps the API's field paths; unknown paths become a form-level message", () => {
    expect(fundErrorsFromDetails([{ path: "body.payerPhone", message: "bad number" }, { path: "body.amount", message: "x" }])).toEqual({ payerPhone: "bad number", form: "x" });
  });

  it("every new funding key is one the API accepts and is never repeated", () => {
    const a = newFundingKey();
    const b = newFundingKey();
    expect(a).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    expect(a).not.toBe(b);
  });
});

describe("what each status says (nothing is 'paid' unless the API says funded)", () => {
  it("has a message for every status the API can report", () => {
    for (const status of FUNDING_STATUS) {
      const message = fundingMessage({ status, payment: status === "funded" ? { id: OFFER_ID, reference: "INV-1", status: "held" } : null, simulated: false });
      expect(message.title.length, status).toBeGreaterThan(0);
      expect(message.text.length, status).toBeGreaterThan(0);
    }
  });

  it("only 'funded' claims the money is held; sent, pending, unclear and failed never do", () => {
    for (const status of FUNDING_STATUS.filter((s) => s !== "funded")) {
      const text = `${fundingMessage({ status, payment: null, simulated: false }).title} ${fundingMessage({ status, payment: null, simulated: false }).text}`;
      expect(text, status).not.toMatch(/held in escrow|your payment .* is held|^Paid/i);
    }
    expect(fundingMessage(fundedView())).toMatchObject({ tone: "good", title: "Paid and held in escrow" });
    expect(fundingMessage(fundedView()).text).toContain("INV-5");
  });

  it("pending and unclear states can be re-checked; final ones cannot", () => {
    expect(["awaiting_confirmation", "indeterminate", "under_review"].every((s) => isUnsettled(s as never))).toBe(true);
    expect(["not_started", "failed", "funded", "expired"].some((s) => isUnsettled(s as never))).toBe(false);
  });
});

describe("what the browser may send", () => {
  const ok = { offerId: OFFER_ID, key: "fund-0123456789abcdef", paymentMethod: "mtn_momo", payerPhone: "677 123 456" };
  it("accepts the four fields", () => expect(startFundingInputSchema.safeParse(ok).success).toBe(true));
  it("refuses an amount, status, provider, brand id, evidence of payment and any other field", () => {
    for (const extra of [{ amountXaf: 1 }, { amount: 1 }, { status: "funded" }, { provider: "fake" }, { brandId: "x" }, { outcome: "succeeded" }, { simulate: true }, { paymentId: "x" }]) {
      expect(startFundingInputSchema.safeParse({ ...ok, ...extra }).success, JSON.stringify(extra)).toBe(false);
    }
  });
  it("refuses a bad offer id, a bad key, an unknown method and a refresh with extra fields", () => {
    for (const bad of [{ offerId: "../x" }, { key: "short" }, { key: "has space in it!" }, { key: "x".repeat(101) }, { paymentMethod: "Bank transfer" }, { payerPhone: "x".repeat(31) }]) {
      expect(startFundingInputSchema.safeParse({ ...ok, ...bad }).success, JSON.stringify(bad)).toBe(false);
    }
    expect(refreshFundingInputSchema.safeParse({ offerId: OFFER_ID }).success).toBe(true);
    expect(refreshFundingInputSchema.safeParse({ offerId: OFFER_ID, status: "funded" }).success).toBe(false);
  });
});

describe("failures", () => {
  const api = (status: number, code: string, extra: { details?: { path: string; message: string }[]; retryAfterSeconds?: number } = {}) => new ApiError({ status, code, message: `API says ${code}`, requestId: "req-1", ...extra });

  it("maps each API answer to a kind", () => {
    expect(fundFailureFrom(api(401, "unauthorized"))).toEqual({ kind: "unauthenticated" });
    expect(fundFailureFrom(api(403, "forbidden"))).toMatchObject({ kind: "forbidden" });
    expect(fundFailureFrom(api(403, "account_not_active"))).toMatchObject({ kind: "conflict" });
    expect(fundFailureFrom(api(404, "not_found"))).toEqual({ kind: "not_found" });
    expect(fundFailureFrom(api(429, "rate_limited", { retryAfterSeconds: 60 }))).toEqual({ kind: "rate_limited", retryAfterSeconds: 60 });
    expect(fundFailureFrom(api(503, "payments_unavailable"))).toEqual({ kind: "payments_unavailable" });
    expect(fundFailureFrom(api(500, "internal_error"))).toEqual({ kind: "unavailable", requestId: "req-1" });
  });

  it.each([
    ["offer_not_fundable", /Only a booking the creator accepted/],
    ["already_funded", /already been paid/],
    ["funding_deadline_passed", /deadline to pay/],
    ["funding_expired", /lapsed/],
    ["funding_in_progress", /already in progress/],
    ["creator_not_active", /creator's account is not active/],
    ["idempotency_key_reused", /start the payment again/],
  ])("409 %s is explained in plain language", (code, message) => {
    expect(fundFailureFrom(api(409, code))).toMatchObject({ kind: "conflict", code, message: expect.stringMatching(message) });
  });

  it("422 amount and method problems are validation with plain text; field paths are mapped", () => {
    expect(fundFailureFrom(api(422, "amount_out_of_range"))).toMatchObject({ kind: "validation", message: expect.stringContaining("10,000 to 50,000,000") });
    expect(fundFailureFrom(api(422, "payment_method_not_supported"))).toMatchObject({ kind: "validation" });
    expect(fundFailureFrom(api(422, "validation_failed", { details: [{ path: "body.payerPhone", message: "bad" }] }))).toEqual({ kind: "validation", fields: { payerPhone: "bad" }, message: null });
  });

  it("network, contract and unexpected errors are 'unavailable' and leak nothing", () => {
    expect(fundFailureFrom(new UpstreamUnavailableError("network"))).toEqual({ kind: "unavailable", requestId: null });
    expect(fundFailureFrom(new UpstreamContractError("shape"))).toEqual({ kind: "unavailable", requestId: null });
  });

  it("definite refusals say nothing was charged; an unclear answer does NOT, and points to 'Check status'", () => {
    for (const failure of [{ kind: "forbidden", message: "No." }, { kind: "not_found" }, { kind: "conflict", code: "x", message: "Nope." }, { kind: "validation", fields: {}, message: null }, { kind: "rate_limited", retryAfterSeconds: null }, { kind: "payments_unavailable" }] as const) {
      expect(fundFailureNotice(failure, "/x").text, failure.kind).toMatch(/charged/);
    }
    const unclear = fundFailureNotice({ kind: "unavailable", requestId: "req-1" }, "/x").text;
    expect(unclear).not.toMatch(/nothing was charged/i);
    expect(unclear).toMatch(/Check status/);
    expect(unclear).toMatch(/can't charge you twice/);
    expect(unclear).toContain("req-1");
  });

  it("an ended session says so without claiming the payment did or did not go through, and links back", () => {
    const notice = fundFailureNotice({ kind: "unauthenticated" }, "/brand/offers/x/fund");
    expect(notice.link?.href).toBe("/sign-in?next=%2Fbrand%2Foffers%2Fx%2Ffund&expired=1");
    expect(notice.text).toMatch(/check its status/);
  });
});

describe("fixtures match the contract", () => {
  it("a payment row for a brand has no fee or net", () => {
    expect(Object.keys(brandPayment())).not.toContain("feeXaf");
    expect(Object.keys(brandPayment())).not.toContain("netXaf");
    expect(fundingView().amountXaf).toBe(250_000);
  });
});
