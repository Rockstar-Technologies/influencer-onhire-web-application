import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiConfigForTests } from "@/lib/api/config";
import { TARGET_ID, TEST_CONFIG, TOKEN, adminMe, adminPaymentDetail, apiUser, errorBody, jsonResponse, routeFetch } from "../helpers";
import { nextState, resetNextState } from "../mocks/next";

vi.mock("next/headers", async () => (await import("../mocks/next")).headersModule);
vi.mock("next/navigation", async () => (await import("../mocks/next")).navigationModule);
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

const actions = await import("@/features/admin/finance-actions");
const server = await import("@/features/admin/finance-server");

const ALL = ["payments.view", "payments.release", "payments.refund", "disputes.uphold", "withdrawals.review", "reconciliation.resolve"];
const calls = (fake: ReturnType<typeof routeFetch>) => fake.keys().filter((k) => k !== "GET /auth/me");
const body = (fake: ReturnType<typeof routeFetch>, key: string) => JSON.parse(String(fake.calls[fake.keys().indexOf(key)]!.init.body));
const NOTE = "Checked the evidence carefully.";
const KEY = "rf-0123456789abcdef";

function upstream(routes: Parameters<typeof routeFetch>[0], permissions: string[] = ALL) {
  const fake = routeFetch({ "GET /auth/me": adminMe(permissions), ...routes });
  vi.stubGlobal("fetch", fake.fetch);
  return fake;
}
const ok = (data: unknown = {}) => jsonResponse(200, { data });

beforeEach(() => {
  resetNextState();
  resetApiConfigForTests();
  vi.stubEnv("API_BASE_URL", TEST_CONFIG.baseUrl);
  vi.stubEnv("TRUSTED_PROXY_HOPS", "0");
  nextState.cookies.set("ioh_session", TOKEN);
});

const PAY = `GET /admin/payments/${TARGET_ID}`;

describe("who may do what (checked before anything is sent)", () => {
  const cases: [string, () => Promise<unknown>, string][] = [
    ["dismiss a dispute", () => actions.dismissDisputeAction({ id: TARGET_ID, note: NOTE }), "payments.release"],
    ["propose upholding", () => actions.upholdDisputeAction({ id: TARGET_ID, kind: "propose", note: NOTE }), "disputes.uphold"],
    ["confirm upholding", () => actions.upholdDisputeAction({ id: TARGET_ID, kind: "confirm", note: NOTE }), "disputes.uphold"],
    ["decide a refund request", () => actions.decideRefundRequestAction({ id: TARGET_ID, kind: "accept", note: NOTE }), "payments.refund"],
    ["record a refund", () => actions.createRefundAction({ paymentId: TARGET_ID, key: KEY, reason: NOTE }), "payments.refund"],
    ["cancel a refund", () => actions.cancelRefundAction({ id: TARGET_ID, note: NOTE }), "payments.refund"],
    ["decide a withdrawal", () => actions.decideWithdrawalAction({ id: TARGET_ID, kind: "reject", note: NOTE }), "withdrawals.review"],
    ["resolve an issue", () => actions.actOnIssueAction({ id: TARGET_ID, kind: "resolve", note: NOTE }), "reconciliation.resolve"],
  ];

  it.each(cases)("%s: refused without %s even with every other permission, and the API is not called", async (_n, run, needed) => {
    const fake = upstream({}, ALL.filter((p) => p !== needed));
    expect(await run()).toMatchObject({ ok: false, error: { kind: "forbidden" } });
    expect(calls(fake)).toEqual([]);
  });

  it.each(cases)("%s: refused for a brand, a creator and an anonymous visitor", async (_n, run) => {
    for (const user of [{ role: "brand" }, { role: "creator" }]) {
      const fake = routeFetch({ "GET /auth/me": jsonResponse(200, { data: { user: apiUser(user), session: { expiresAt: "2026-12-31T00:00:00.000Z" } } }) });
      vi.stubGlobal("fetch", fake.fetch);
      expect(await run(), JSON.stringify(user)).toMatchObject({ ok: false, error: { kind: "forbidden" } });
      expect(calls(fake)).toEqual([]);
    }
    nextState.cookies.clear();
    upstream({});
    expect(await run()).toMatchObject({ ok: false, error: { kind: "unauthenticated" } });
  });
});

describe("strict inputs", () => {
  it("refuses extra fields (amount, actor, status), bad ids, short notes and unknown kinds before calling", async () => {
    const fake = upstream({});
    const bad: unknown[] = [
      actions.dismissDisputeAction({ id: TARGET_ID, note: NOTE, resolution: "upheld" }),
      actions.dismissDisputeAction({ id: "../x", note: NOTE }),
      actions.dismissDisputeAction({ id: TARGET_ID, note: "no" }),
      actions.upholdDisputeAction({ id: TARGET_ID, kind: "propose" }),
      actions.upholdDisputeAction({ id: TARGET_ID, kind: "force", note: NOTE }),
      actions.upholdDisputeAction({ id: TARGET_ID, kind: "confirm", note: NOTE, proposedBy: "me" }),
      actions.decideRefundRequestAction({ id: TARGET_ID, kind: "accept", note: NOTE, amountXaf: 1 }),
      actions.createRefundAction({ paymentId: TARGET_ID, key: KEY, reason: NOTE, amountXaf: 1 }),
      actions.createRefundAction({ paymentId: TARGET_ID, key: "short", reason: NOTE }),
      actions.createRefundAction({ paymentId: TARGET_ID, key: KEY, reason: "no" }),
      actions.decideWithdrawalAction({ id: TARGET_ID, kind: "reject" }),
      actions.decideWithdrawalAction({ id: TARGET_ID, kind: "pay", note: NOTE }),
      actions.decideWithdrawalAction({ id: TARGET_ID, kind: "approve", status: "completed" }),
      actions.actOnIssueAction({ id: TARGET_ID, kind: "delete", note: NOTE }),
      actions.actOnIssueAction({ id: TARGET_ID, kind: "resolve", note: "" }),
    ];
    for (const result of await Promise.all(bad)) expect(result).toMatchObject({ ok: false, error: { kind: "validation" } });
    expect(calls(fake)).toEqual([]);
  });
});

describe("dispute decisions and the two-administrator rule", () => {
  const route = (kind: string) => `POST /admin/payments/${TARGET_ID}/dispute/uphold/${kind}`;
  it("dismiss sends the fixed resolution and the note, and nothing else", async () => {
    const fake = upstream({ [`POST /admin/payments/${TARGET_ID}/dispute/resolve`]: ok({ payment: {} }) });
    expect(await actions.dismissDisputeAction({ id: TARGET_ID, note: NOTE })).toEqual({ ok: true, status: "dismissed" });
    expect(body(fake, `POST /admin/payments/${TARGET_ID}/dispute/resolve`)).toEqual({ resolution: "dismissed", note: NOTE });
  });
  it("propose, confirm and decline send only the note; withdraw sends nothing", async () => {
    const fake = upstream({ [route("propose")]: ok({}), [route("confirm")]: ok({}), [route("decline")]: ok({}), [route("withdraw")]: ok({}) });
    for (const kind of ["propose", "confirm", "decline"] as const) expect(await actions.upholdDisputeAction({ id: TARGET_ID, kind, note: NOTE })).toEqual({ ok: true, status: kind });
    expect(await actions.upholdDisputeAction({ id: TARGET_ID, kind: "withdraw" })).toEqual({ ok: true, status: "withdraw" });
    for (const kind of ["propose", "confirm", "decline"]) expect(body(fake, route(kind))).toEqual({ note: NOTE });
    expect(body(fake, route("withdraw"))).toEqual({});
  });
  it("the proposer confirming their own proposal is refused by the API and shown as a plain conflict, never as success", async () => {
    upstream({ [route("confirm")]: jsonResponse(403, errorBody("second_confirmation_required")) });
    const result = await actions.upholdDisputeAction({ id: TARGET_ID, kind: "confirm", note: NOTE });
    expect(result).toMatchObject({ ok: false, error: { kind: "conflict", code: "second_confirmation_required", message: expect.stringContaining("different administrator") } });
  });
  it("a repeated confirm is success only if a fresh read shows the dispute upheld; a lost race is a conflict", async () => {
    const upheld = adminPaymentDetail({ dispute: { id: TARGET_ID, status: "resolved_in_favour", reason: "x", openedAt: null, resolvedAt: null, awaitingPolicyDecision: true } });
    upstream({ [route("confirm")]: jsonResponse(409, errorBody("no_pending_proposal")), [PAY]: ok({ payment: upheld }) });
    expect(await actions.upholdDisputeAction({ id: TARGET_ID, kind: "confirm", note: NOTE })).toEqual({ ok: true, status: "confirm" });
    upstream({ [route("confirm")]: jsonResponse(409, errorBody("no_pending_proposal")), [PAY]: ok({ payment: adminPaymentDetail() }) });
    expect(await actions.upholdDisputeAction({ id: TARGET_ID, kind: "confirm", note: NOTE })).toMatchObject({ ok: false, error: { kind: "conflict" } });
  });
  it("dismissing while a proposal is pending is refused with the API's reason", async () => {
    upstream({ [`POST /admin/payments/${TARGET_ID}/dispute/resolve`]: jsonResponse(409, errorBody("outcome_pending_confirmation")) });
    expect(await actions.dismissDisputeAction({ id: TARGET_ID, note: NOTE })).toMatchObject({ ok: false, error: { kind: "conflict", code: "outcome_pending_confirmation" } });
  });
});

describe("refund requests and refunds never claim a refund", () => {
  const ACCEPT = `POST /admin/refund-requests/${TARGET_ID}/accept`;
  it("accepting records the decision and reports only 'accepted'", async () => {
    const fake = upstream({ [ACCEPT]: ok({ request: {} }) });
    expect(await actions.decideRefundRequestAction({ id: TARGET_ID, kind: "accept", note: NOTE })).toEqual({ ok: true, status: "accepted" });
    expect(body(fake, ACCEPT)).toEqual({ note: NOTE });
  });
  it("a second decision is success only if a fresh read shows the wanted status", async () => {
    const request = (status: string) => ok({ request: { id: TARGET_ID, status } });
    upstream({ [ACCEPT]: jsonResponse(409, errorBody("refund_request_closed")), [`GET /admin/refund-requests/${TARGET_ID}`]: request("rejected") });
    expect(await actions.decideRefundRequestAction({ id: TARGET_ID, kind: "accept", note: NOTE })).toMatchObject({ ok: false, error: { kind: "conflict" } });
  });
  const REFUND = `POST /admin/payments/${TARGET_ID}/refund`;
  it("the refund amount is the payment's gross read from the API, never from the browser, and the key goes in the header only", async () => {
    const held = adminPaymentDetail({ status: "held", amountXaf: 85000, actions: { canRelease: false, canRefund: true } });
    const created = ok({ refund: { id: TARGET_ID, status: "completed" }, replayed: false });
    const fake = upstream({ [PAY]: ok({ payment: held }), [REFUND]: jsonResponse(201, { data: { refund: refundBody("completed"), replayed: false } }) });
    void created;
    expect(await actions.createRefundAction({ paymentId: TARGET_ID, key: KEY, reason: NOTE })).toEqual({ ok: true, status: "completed" });
    expect(body(fake, REFUND)).toEqual({ amountXaf: 85000, reason: NOTE });
    const call = fake.calls[fake.keys().indexOf(REFUND)]!;
    expect(new Headers(call.init.headers as HeadersInit).get("idempotency-key")).toBe(KEY);
    expect(String(call.url)).not.toContain(KEY);
  });
  it("a payment that is not held, or that the API does not flag as refundable, is refused without calling the refund route", async () => {
    for (const payment of [adminPaymentDetail({ status: "requested" }), adminPaymentDetail({ status: "held", actions: { canRelease: false, canRefund: false } })]) {
      const fake = upstream({ [PAY]: ok({ payment }) });
      expect(await actions.createRefundAction({ paymentId: TARGET_ID, key: KEY, reason: NOTE })).toMatchObject({ ok: false, error: { kind: "conflict" } });
      expect(calls(fake)).toEqual([PAY]);
    }
  });
  it("a reused key with other content, a refund after delivery and an unclear answer are reported honestly", async () => {
    const held = adminPaymentDetail({ status: "held", actions: { canRelease: false, canRefund: true } });
    upstream({ [PAY]: ok({ payment: held }), [REFUND]: jsonResponse(409, errorBody("idempotency_key_reused")) });
    expect(await actions.createRefundAction({ paymentId: TARGET_ID, key: KEY, reason: NOTE })).toMatchObject({ ok: false, error: { kind: "conflict", code: "idempotency_key_reused" } });
    upstream({ [PAY]: ok({ payment: held }), [REFUND]: jsonResponse(409, errorBody("refund_after_delivery")) });
    expect(await actions.createRefundAction({ paymentId: TARGET_ID, key: KEY, reason: NOTE })).toMatchObject({ ok: false, error: { kind: "conflict", code: "refund_after_delivery" } });
    upstream({ [PAY]: ok({ payment: held }), [REFUND]: jsonResponse(502, errorBody("bad_gateway")) });
    expect(await actions.createRefundAction({ paymentId: TARGET_ID, key: KEY, reason: NOTE })).toMatchObject({ ok: false, error: { kind: "unavailable" } });
  });
  it("cancelling a refund confirms only what the API confirmed", async () => {
    upstream({ [`POST /admin/refunds/${TARGET_ID}/cancel`]: ok({ refund: {} }) });
    expect(await actions.cancelRefundAction({ id: TARGET_ID, note: NOTE })).toEqual({ ok: true, status: "cancelled" });
    upstream({ [`POST /admin/refunds/${TARGET_ID}/cancel`]: jsonResponse(409, errorBody("refund_not_cancellable")), [`GET /admin/refunds/${TARGET_ID}`]: ok({ refund: refundBody("completed") }) });
    expect(await actions.cancelRefundAction({ id: TARGET_ID, note: NOTE })).toMatchObject({ ok: false, error: { kind: "conflict" } });
  });
});

function refundBody(status: string) {
  return { id: TARGET_ID, paymentId: TARGET_ID, invoiceNo: 8, offerId: null, amountXaf: 85000, status, paymentStatus: "refunded", refundRequest: null, reason: "x", requestedAt: "2026-10-20T10:00:00.000Z", completedAt: null, cancelledAt: null, cancelNote: null, simulated: true, realMoneyReturned: false, note: "Simulated refund: no real money moved.", canCancel: false };
}

describe("withdrawal review", () => {
  const APPROVE = `POST /admin/withdrawals/${TARGET_ID}/approve`;
  const REJECT = `POST /admin/withdrawals/${TARGET_ID}/reject`;
  it("approve may omit the note; reject needs one; both report only the status the API confirmed", async () => {
    const fake = upstream({ [APPROVE]: ok({}), [REJECT]: ok({}) });
    expect(await actions.decideWithdrawalAction({ id: TARGET_ID, kind: "approve" })).toEqual({ ok: true, status: "approved" });
    expect(body(fake, APPROVE)).toEqual({});
    expect(await actions.decideWithdrawalAction({ id: TARGET_ID, kind: "reject", note: NOTE })).toEqual({ ok: true, status: "rejected" });
    expect(body(fake, REJECT)).toEqual({ note: NOTE });
  });
  it("a request the creator already cancelled, or one not under review, is a plain conflict", async () => {
    upstream({ [APPROVE]: jsonResponse(409, errorBody("withdrawal_not_reviewable")), [`GET /admin/withdrawals/${TARGET_ID}`]: ok({ withdrawal: withdrawalBody("cancelled") }) });
    expect(await actions.decideWithdrawalAction({ id: TARGET_ID, kind: "approve" })).toMatchObject({ ok: false, error: { kind: "conflict", code: "withdrawal_not_reviewable" } });
  });
  it("a repeated approval is success only if the fresh read shows approved", async () => {
    upstream({ [APPROVE]: jsonResponse(409, errorBody("withdrawal_not_reviewable")), [`GET /admin/withdrawals/${TARGET_ID}`]: ok({ withdrawal: withdrawalBody("approved") }) });
    expect(await actions.decideWithdrawalAction({ id: TARGET_ID, kind: "approve" })).toEqual({ ok: true, status: "approved" });
  });
  it("a rate limit is reported and nothing is claimed", async () => {
    upstream({ [REJECT]: jsonResponse(429, errorBody("rate_limited"), { "retry-after": "30" }) });
    expect(await actions.decideWithdrawalAction({ id: TARGET_ID, kind: "reject", note: NOTE })).toMatchObject({ ok: false, error: { kind: "rate_limited" } });
  });
});

function withdrawalBody(status: string) {
  return { id: TARGET_ID, amountXaf: 5000, currency: "XAF", status, requestedAt: "2026-10-20T10:00:00.000Z", closedAt: null, completedAt: null, failedAt: null, destination: { method: "mtn_momo", last3: "001" }, creator: { id: TARGET_ID, username: "kevin", displayName: "Kevin" }, riskReasons: ["launch_review"], review: { reviewedBy: null, reviewedAt: null, note: null }, simulatedFunds: false, canApprove: false, canReject: false };
}

describe("reconciliation issues", () => {
  const RESOLVE = `POST /admin/payments/issues/${TARGET_ID}/resolve`;
  it("sends only the note and reports resolved/dismissed after confirmation", async () => {
    const fake = upstream({ [RESOLVE]: ok({ issue: {} }), [`POST /admin/payments/issues/${TARGET_ID}/dismiss`]: ok({ issue: {} }) });
    expect(await actions.actOnIssueAction({ id: TARGET_ID, kind: "resolve", note: NOTE })).toEqual({ ok: true, status: "resolved" });
    expect(body(fake, RESOLVE)).toEqual({ note: NOTE });
    expect(await actions.actOnIssueAction({ id: TARGET_ID, kind: "dismiss", note: NOTE })).toEqual({ ok: true, status: "dismissed" });
  });
  it("an issue whose collection is still pending cannot be closed, and a non-dismissible kind says so", async () => {
    upstream({ [RESOLVE]: jsonResponse(409, errorBody("collection_unresolved")) });
    expect(await actions.actOnIssueAction({ id: TARGET_ID, kind: "resolve", note: NOTE })).toMatchObject({ ok: false, error: { kind: "conflict", message: expect.stringContaining("unresolved at the provider") } });
    upstream({ [`POST /admin/payments/issues/${TARGET_ID}/dismiss`]: jsonResponse(409, errorBody("issue_not_dismissible")) });
    expect(await actions.actOnIssueAction({ id: TARGET_ID, kind: "dismiss", note: NOTE })).toMatchObject({ ok: false, error: { kind: "conflict", code: "issue_not_dismissible" } });
  });
});

describe("loaders", () => {
  it("only known filter values are forwarded to the API", async () => {
    expect(server.parseRefundRequestQuery({ status: "bogus;drop", followUp: "x", needsAction: "true", cursor: "a b" })).toEqual({ needsAction: true });
    expect(server.parseWithdrawalQuery({ status: "approved", needsReview: "1" })).toEqual({ status: "approved" });
    expect(server.parseRefundQuery({ status: "completed" })).toEqual({ status: "completed" });
    expect(server.parseIssueQuery({ resolved: "true" })).toEqual({ resolved: true });
  });
  it("the attention report is validated, and an unreadable one is null rather than a guess", async () => {
    upstream({ "GET /admin/payments/attention": jsonResponse(200, { data: { attention: { nope: true } } }) });
    expect(await server.loadAttention("/admin")).toBeNull();
    upstream({ "GET /admin/payments/diagnostics": jsonResponse(500, errorBody("internal")) });
    expect(await server.loadDiagnostics()).toBeNull();
  });
  it("a claim that a refund returned real money is a contract violation", async () => {
    upstream({ [`GET /admin/refunds/${TARGET_ID}`]: ok({ refund: { ...refundBody("completed"), realMoneyReturned: true } }) });
    await expect(server.loadRefund(TARGET_ID)).rejects.toThrow();
  });
  it("a withdrawal claiming to be paid from simulated funds is a contract violation", async () => {
    upstream({ [`GET /admin/withdrawals/${TARGET_ID}`]: ok({ withdrawal: { ...withdrawalBody("requested"), simulatedFunds: true } }) });
    await expect(server.loadWithdrawal(TARGET_ID)).rejects.toThrow();
  });
});
