import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiConfigForTests } from "@/lib/api/config";
import { TEST_CONFIG, TOKEN, apiUser, brandPayment, creatorPayment, creatorWallet, errorBody, jsonResponse, routeFetch, withdrawalView } from "../helpers";
import { nextState, redirectTarget, resetNextState } from "../mocks/next";

vi.mock("next/headers", async () => (await import("../mocks/next")).headersModule);
vi.mock("next/navigation", async () => (await import("../mocks/next")).navigationModule);
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

const actions = await import("@/features/payments/actions");
const server = await import("@/features/payments/server");

const PID = "88888888-8888-4888-8888-888888888888";
const WID = "77777777-7777-4777-8777-777777777777";
const KEY = "wd-0123456789abcdef";
const me = (user: Record<string, unknown> = {}) => jsonResponse(200, { data: { user: apiUser(user), session: { expiresAt: "2026-12-31T00:00:00.000Z" } } });
const calls = (fake: ReturnType<typeof routeFetch>) => fake.keys().filter((k) => k !== "GET /auth/me");
const REPORT = { id: PID, summary: "I delivered the agreed reel and three stories.", links: ["https://example.com/post"] };

function upstream(routes: Parameters<typeof routeFetch>[0], user: Record<string, unknown> = { role: "creator" }) {
  const fake = routeFetch({ "GET /auth/me": me(user), ...routes });
  vi.stubGlobal("fetch", fake.fetch);
  return fake;
}

beforeEach(() => {
  resetNextState();
  resetApiConfigForTests();
  vi.stubEnv("API_BASE_URL", TEST_CONFIG.baseUrl);
  vi.stubEnv("TRUSTED_PROXY_HOPS", "0");
  nextState.cookies.set("ioh_session", TOKEN);
});

describe("role gates run before anything is sent", () => {
  it("a brand cannot use creator actions and a creator cannot use brand actions", async () => {
    const asBrand = upstream({}, { role: "brand" });
    expect(await actions.submitDeliveryReportAction(REPORT)).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    expect(await actions.requestWithdrawalAction({ key: KEY, amountXaf: 5000, method: "mtn_momo" })).toMatchObject({ ok: false });
    expect(await actions.cancelWithdrawalAction({ id: WID })).toMatchObject({ ok: false });
    expect(calls(asBrand)).toEqual([]);
    const asCreator = upstream({}, { role: "creator" });
    expect(await actions.decideDeliveryAction({ id: PID, kind: "acknowledge" })).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    expect(await actions.requestRefundReviewAction({ id: PID, reason: "Nothing was delivered." })).toMatchObject({ ok: false });
    expect(await actions.withdrawRefundReviewAction({ id: WID })).toMatchObject({ ok: false });
    expect(calls(asCreator)).toEqual([]);
  });

  it("an administrator and an anonymous visitor are refused", async () => {
    const admin = upstream({}, { role: "admin" });
    expect(await actions.submitDeliveryReportAction(REPORT)).toMatchObject({ ok: false });
    expect(calls(admin)).toEqual([]);
    nextState.cookies.clear();
    const anon = upstream({});
    expect(await actions.requestWithdrawalAction({ key: KEY, amountXaf: 5000, method: "mtn_momo" })).toMatchObject({ ok: false, error: { kind: "unauthenticated" } });
    expect(calls(anon)).toEqual([]);
  });
});

describe("delivery report", () => {
  const ROUTE = `POST /creator/payments/${PID}/delivery-report`;
  it("sends only the summary and links, and reports 'requested' only after the API confirmed", async () => {
    const fake = upstream({ [ROUTE]: jsonResponse(200, { data: { payment: creatorPayment({ status: "requested" }) } }) });
    expect(await actions.submitDeliveryReportAction(REPORT)).toEqual({ ok: true, status: "requested" });
    const call = fake.calls[fake.keys().indexOf(ROUTE)]!;
    expect(JSON.parse(String(call.init.body))).toEqual({ summary: REPORT.summary, links: REPORT.links });
  });

  it("refuses extra fields (owner, status, amount) and bad evidence, sending nothing", async () => {
    const fake = upstream({});
    for (const extra of [{ status: "released" }, { amountXaf: 1 }, { creatorId: "x" }, { netXaf: 9 }]) expect(await actions.submitDeliveryReportAction({ ...REPORT, ...extra })).toMatchObject({ ok: false });
    for (const bad of [{ summary: "too short" }, { links: [] }, { links: ["ftp://x.com/a"] }, { links: ["javascript:alert(1)"] }, { links: ["https://u:p@x.com/a"] }, { links: ["https://a.com/1", "https://a.com/1"] }, { links: Array.from({ length: 6 }, (_, i) => `https://a.com/${i}`) }, { id: "../x" }]) {
      expect(await actions.submitDeliveryReportAction({ ...REPORT, ...bad }), JSON.stringify(bad)).toMatchObject({ ok: false, error: { kind: "validation" } });
    }
    expect(calls(fake)).toEqual([]);
  });

  it("a second report (409) is success only when a fresh read shows the payment requested; a released payment is a conflict", async () => {
    upstream({ [ROUTE]: jsonResponse(409, errorBody("delivery_already_reported")), [`GET /creator/payments/${PID}`]: jsonResponse(200, { data: { payment: creatorPayment({ status: "requested" }) } }) });
    expect(await actions.submitDeliveryReportAction(REPORT)).toEqual({ ok: true, status: "requested" });
    upstream({ [ROUTE]: jsonResponse(409, errorBody("payment_already_released")), [`GET /creator/payments/${PID}`]: jsonResponse(200, { data: { payment: creatorPayment({ status: "released" }) } }) });
    expect(await actions.submitDeliveryReportAction(REPORT)).toMatchObject({ ok: false, error: { kind: "conflict" } });
  });

  it("another creator's payment is not found", async () => {
    upstream({ [ROUTE]: jsonResponse(404, errorBody("not_found")) });
    expect(await actions.submitDeliveryReportAction(REPORT)).toMatchObject({ ok: false, error: { kind: "not_found" } });
  });

  it("a lost answer is never reported as done or as 'nothing happened'", async () => {
    upstream({ [ROUTE]: jsonResponse(500, errorBody("internal")) });
    const result = await actions.submitDeliveryReportAction(REPORT);
    expect(result).toMatchObject({ ok: false, error: { kind: "unavailable" } });
  });
});

describe("withdrawal request", () => {
  const ROUTE = "POST /creator/withdrawals";
  const INPUT = { key: KEY, amountXaf: 5000, method: "mtn_momo" };

  it("sends the amount and network only, with the Idempotency-Key header and never in the URL", async () => {
    const fake = upstream({ [ROUTE]: jsonResponse(201, { data: { withdrawal: withdrawalView(), replayed: false } }) });
    expect(await actions.requestWithdrawalAction(INPUT)).toEqual({ ok: true, status: "requested", replayed: false });
    const call = fake.calls[fake.keys().indexOf(ROUTE)]!;
    expect(JSON.parse(String(call.init.body))).toEqual({ amountXaf: 5000, method: "mtn_momo" });
    expect(new Headers(call.init.headers as HeadersInit).get("idempotency-key")).toBe(KEY);
    expect(String(call.url)).not.toContain(KEY);
  });

  it("a replay is reported as a replay", async () => {
    upstream({ [ROUTE]: jsonResponse(200, { data: { withdrawal: withdrawalView(), replayed: true } }) });
    expect(await actions.requestWithdrawalAction(INPUT)).toMatchObject({ ok: true, replayed: true });
  });

  it("refuses a phone number, destination, balance, status, fractions, negatives and odd keys or methods before calling", async () => {
    const fake = upstream({});
    for (const extra of [{ phone: "670000001" }, { destination: "x" }, { status: "completed" }, { balanceXaf: 1e9 }, { simulated: true }]) expect(await actions.requestWithdrawalAction({ ...INPUT, ...extra })).toMatchObject({ ok: false });
    for (const bad of [{ amountXaf: 0 }, { amountXaf: -5 }, { amountXaf: 10.5 }, { amountXaf: "5000" }, { key: "short" }, { key: "has spaces!!" }, { method: "bank" }]) expect(await actions.requestWithdrawalAction({ ...INPUT, ...bad }), JSON.stringify(bad)).toMatchObject({ ok: false, error: { kind: "validation" } });
    expect(calls(fake)).toEqual([]);
  });

  it("a key reused with other details, an over-balance amount and a missing payout account are plain failures", async () => {
    upstream({ [ROUTE]: jsonResponse(409, errorBody("idempotency_key_reused")) });
    expect(await actions.requestWithdrawalAction(INPUT)).toMatchObject({ ok: false, error: { kind: "conflict", code: "idempotency_key_reused" } });
    upstream({ [ROUTE]: jsonResponse(422, errorBody("validation_failed", "bad", { details: [{ path: "body.amountXaf", message: "at most 1000 XAF can be withdrawn" }] })) });
    expect(await actions.requestWithdrawalAction(INPUT)).toMatchObject({ ok: false, error: { kind: "validation", message: expect.stringContaining("at most 1000") } });
  });

  it("a rate limit and an unclear outcome never say it worked", async () => {
    upstream({ [ROUTE]: jsonResponse(429, errorBody("rate_limited"), { "retry-after": "60" }) });
    expect(await actions.requestWithdrawalAction(INPUT)).toMatchObject({ ok: false, error: { kind: "rate_limited" } });
    upstream({ [ROUTE]: jsonResponse(502, errorBody("bad_gateway")) });
    expect(await actions.requestWithdrawalAction(INPUT)).toMatchObject({ ok: false, error: { kind: "unavailable" } });
  });

  it("a response that breaks the contract is not trusted", async () => {
    upstream({ [ROUTE]: jsonResponse(201, { data: { withdrawal: { id: WID }, replayed: false } }) });
    expect(await actions.requestWithdrawalAction(INPUT)).toMatchObject({ ok: false, error: { kind: "unavailable" } });
  });
});

describe("cancel a withdrawal", () => {
  const ROUTE = `POST /creator/withdrawals/${WID}/cancel`;
  it("confirms only what the API confirmed; a repeat is success only if the read shows cancelled", async () => {
    upstream({ [ROUTE]: jsonResponse(200, { data: { withdrawal: withdrawalView({ status: "cancelled" }) } }) });
    expect(await actions.cancelWithdrawalAction({ id: WID })).toEqual({ ok: true, status: "cancelled" });
    upstream({ [ROUTE]: jsonResponse(409, errorBody("withdrawal_not_cancellable")), [`GET /creator/withdrawals/${WID}`]: jsonResponse(200, { data: { withdrawal: withdrawalView({ status: "approved" }) } }) });
    expect(await actions.cancelWithdrawalAction({ id: WID })).toMatchObject({ ok: false, error: { kind: "conflict" } });
    upstream({ [ROUTE]: jsonResponse(409, errorBody("withdrawal_not_cancellable")), [`GET /creator/withdrawals/${WID}`]: jsonResponse(200, { data: { withdrawal: withdrawalView({ status: "cancelled" }) } }) });
    expect(await actions.cancelWithdrawalAction({ id: WID })).toEqual({ ok: true, status: "cancelled" });
  });
  it("refuses a bad id without calling", async () => {
    const fake = upstream({});
    expect(await actions.cancelWithdrawalAction({ id: "../x" })).toMatchObject({ ok: false });
    expect(await actions.cancelWithdrawalAction({ id: WID, status: "x" })).toMatchObject({ ok: false });
    expect(calls(fake)).toEqual([]);
  });
});

describe("brand delivery decisions and refund review requests", () => {
  const brand = { role: "brand" };
  it("acknowledge posts an empty body to the right route; dispute needs a reason and sends only it", async () => {
    const ok = jsonResponse(200, { data: { payment: brandPayment() } });
    const fake = upstream({ [`POST /brand/payments/${PID}/acknowledge-delivery`]: ok, [`POST /brand/payments/${PID}/dispute`]: ok, [`POST /brand/payments/${PID}/dispute/withdraw`]: ok }, brand);
    expect(await actions.decideDeliveryAction({ id: PID, kind: "acknowledge" })).toEqual({ ok: true, status: "acknowledge" });
    expect(await actions.decideDeliveryAction({ id: PID, kind: "dispute" })).toMatchObject({ ok: false, error: { kind: "validation" } });
    expect(await actions.decideDeliveryAction({ id: PID, kind: "dispute", reason: "Never posted" })).toMatchObject({ ok: true });
    expect(await actions.decideDeliveryAction({ id: PID, kind: "withdraw_dispute" })).toMatchObject({ ok: true });
    const dispute = fake.calls[fake.keys().indexOf(`POST /brand/payments/${PID}/dispute`)]!;
    expect(JSON.parse(String(dispute.init.body))).toEqual({ reason: "Never posted" });
    const ack = fake.calls[fake.keys().indexOf(`POST /brand/payments/${PID}/acknowledge-delivery`)]!;
    expect(JSON.parse(String(ack.init.body))).toEqual({});
  });

  it("refuses unknown kinds and extra fields", async () => {
    const fake = upstream({}, brand);
    for (const bad of [{ kind: "release" }, { kind: "refund" }, { kind: "acknowledge", status: "released" }, { kind: "acknowledge", amountXaf: 1 }]) expect(await actions.decideDeliveryAction({ id: PID, ...bad })).toMatchObject({ ok: false });
    expect(calls(fake)).toEqual([]);
  });

  it("a closed dispute window, an acknowledged delivery and duplicate disputes are explained, not hidden", async () => {
    for (const code of ["dispute_window_closed", "delivery_acknowledged", "dispute_exists", "no_open_dispute"]) {
      upstream({ [`POST /brand/payments/${PID}/dispute`]: jsonResponse(409, errorBody(code)) }, brand);
      const result = await actions.decideDeliveryAction({ id: PID, kind: "dispute", reason: "Never posted" });
      expect(result, code).toMatchObject({ ok: false, error: { kind: "conflict", code } });
    }
  });

  it("a refund review request sends only the reason and is reported as a request, never a refund", async () => {
    const fake = upstream({ [`POST /brand/payments/${PID}/refund-request`]: jsonResponse(201, { data: { request: { id: WID, paymentId: PID, reference: "INV-5", status: "requested", reason: "Nothing delivered", requestedAt: "2031-01-01T00:00:00.000Z", decidedAt: null, withdrawnAt: null, canWithdraw: true } } }) }, brand);
    expect(await actions.requestRefundReviewAction({ id: PID, reason: "Nothing delivered" })).toEqual({ ok: true, status: "requested" });
    expect(JSON.parse(String(fake.calls[fake.keys().indexOf(`POST /brand/payments/${PID}/refund-request`)]!.init.body))).toEqual({ reason: "Nothing delivered" });
    expect(await actions.requestRefundReviewAction({ id: PID, reason: "Nothing delivered", amountXaf: 5 })).toMatchObject({ ok: false });
    expect(await actions.requestRefundReviewAction({ id: PID, reason: "no" })).toMatchObject({ ok: false, error: { kind: "validation" } });
  });

  it("an ineligible refund request is a conflict with plain text", async () => {
    for (const code of ["refund_request_too_early", "refund_request_not_available", "refund_request_exists"]) {
      upstream({ [`POST /brand/payments/${PID}/refund-request`]: jsonResponse(409, errorBody(code)) }, brand);
      const result = await actions.requestRefundReviewAction({ id: PID, reason: "Nothing delivered" });
      expect(result, code).toMatchObject({ ok: false, error: { kind: "conflict", message: expect.not.stringContaining("_") } });
    }
  });

  it("withdraws a refund request by id only", async () => {
    upstream({ [`POST /brand/refund-requests/${WID}/withdraw`]: jsonResponse(200, { data: { request: { id: WID, paymentId: PID, reference: "INV-5", status: "withdrawn", reason: "x y z w v", requestedAt: "t", decidedAt: null, withdrawnAt: "t", canWithdraw: false } } }) }, brand);
    expect(await actions.withdrawRefundReviewAction({ id: WID })).toEqual({ ok: true, status: "withdrawn" });
  });
});

describe("loaders", () => {
  const ROUTES = {
    "GET /creator/payments": jsonResponse(200, { data: [creatorPayment()], meta: { nextCursor: null, limit: 50 } }),
    "GET /creator/wallet": jsonResponse(200, { data: { wallet: creatorWallet() } }),
    "GET /creator/withdrawals": jsonResponse(200, { data: [withdrawalView()], meta: { nextCursor: null, limit: 50 } }),
  };
  it("loads payments, wallet and withdrawals from the API only", async () => {
    upstream(ROUTES);
    const data = await server.loadCreatorPayments();
    expect(data.payments[0]).toMatchObject({ netXaf: 200_000, feeXaf: 50_000 });
    expect(data.wallet.availableXaf).toBe(10_000);
    expect(data.withdrawals).toHaveLength(1);
  });
  it("an expired session redirects to sign-in with the return path", async () => {
    upstream({ ...ROUTES, "GET /creator/wallet": jsonResponse(401, errorBody("unauthorized")) });
    const target = await redirectTarget(() => server.loadCreatorPayments("/creator/earnings"));
    expect(target).toContain("expired=1");
    expect(target).toContain(encodeURIComponent("/creator/earnings"));
  });
  it("a wallet that claims simulated money is withdrawable is rejected as a contract violation", async () => {
    const bad = creatorWallet();
    upstream({ ...ROUTES, "GET /creator/wallet": jsonResponse(200, { data: { wallet: { ...bad, simulated: { ...bad.simulated, withdrawable: true } } } }) });
    await expect(server.loadCreatorPayments()).rejects.toThrow();
  });
});
