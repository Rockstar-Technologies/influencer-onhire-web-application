import { describe, expect, it } from "vitest";
import { NOTIFICATION_KIND_LABELS, badgeText, kindLabel, targetOf, toneOf, whenText } from "@/features/notifications/mapping";
import { NOTIFICATION_TYPE } from "@/lib/domain/vocabulary";
import { notificationFailureFrom, notificationFailureNotice } from "@/features/notifications/failure";
import { ApiError, UpstreamUnavailableError } from "@/lib/api/errors";
import { markAllReadInputSchema, markReadInputSchema } from "@/features/notifications/schemas";
import { notificationViewSchema } from "@/lib/api/schemas";
import { NOTIFICATION_ID, notificationView } from "../helpers";

const NONE = { campaignId: null, offerId: null, paymentId: null, withdrawalId: null };
const CAMPAIGN = "33333333-3333-4333-8333-333333333333";

describe("kinds and tones", () => {
  it("every kind the API can write has a label, and an unknown kind is a plain 'Notification'", () => {
    for (const type of NOTIFICATION_TYPE.values) expect(NOTIFICATION_KIND_LABELS[type].length, type).toBeGreaterThan(0);
    expect(kindLabel("brand_new_kind")).toBe("Notification");
    expect(kindLabel("")).toBe("Notification");
  });

  it("problems are 'attention', good news is 'good', everything else (and anything unknown) is neutral", () => {
    expect(toneOf("payment_failed")).toBe("attention");
    expect(toneOf("account_suspended")).toBe("attention");
    expect(toneOf("offer_accepted")).toBe("good");
    expect(toneOf("offer_received")).toBe("neutral");
    expect(toneOf("brand_new_kind")).toBe("neutral");
  });
});

describe("where 'View' leads (only pages that exist for the person's own area)", () => {
  it("an offer leads to the hire list for a brand and to the requests inbox for a creator", () => {
    expect(targetOf({ ...NONE, offerId: "x" }, "brand")?.href).toBe("/brand/offers");
    expect(targetOf({ ...NONE, offerId: "x" }, "creator")?.href).toBe("/creator/requests");
  });
  it("a campaign leads to the brand's campaign page, and nowhere for a creator (no such page)", () => {
    expect(targetOf({ ...NONE, campaignId: CAMPAIGN }, "brand")?.href).toBe(`/brand/campaigns/${CAMPAIGN}`);
    expect(targetOf({ ...NONE, campaignId: CAMPAIGN }, "creator")).toBeNull();
  });
  it("payments and withdrawals lead to the person's own payments page", () => {
    expect(targetOf({ ...NONE, paymentId: "x" }, "brand")?.href).toBe("/brand/payments");
    expect(targetOf({ ...NONE, withdrawalId: "x" }, "creator")?.href).toBe("/creator/payments");
  });
  it("a notification with no linked record has no link", () => {
    expect(targetOf(NONE, "brand")).toBeNull();
  });
});

describe("unread badge", () => {
  it("shows nothing for zero, the number up to 99, and 99+ beyond; never garbage", () => {
    expect(badgeText(0)).toBeNull();
    expect(badgeText(-3)).toBeNull();
    expect(badgeText(Number.NaN)).toBeNull();
    expect(badgeText(1)).toBe("1");
    expect(badgeText(99)).toBe("99");
    expect(badgeText(100)).toBe("99+");
    expect(badgeText(5000)).toBe("99+");
  });
});

describe("time text", () => {
  const now = Date.parse("2026-10-19T12:00:00.000Z");
  it("is relative for the first day and a date afterwards; an unreadable value is empty", () => {
    expect(whenText("2026-10-19T11:59:40.000Z", now)).toBe("just now");
    expect(whenText("2026-10-19T11:30:00.000Z", now)).toBe("30 min ago");
    expect(whenText("2026-10-19T07:00:00.000Z", now)).toBe("5 h ago");
    expect(whenText("2026-10-01T07:00:00.000Z", now)).toMatch(/Oct 1, 2026/);
    expect(whenText("nonsense", now)).toBe("");
  });
});

describe("what the API returns and what the browser may send", () => {
  it("accepts the API's shape, including a kind this app does not know and a null read time", () => {
    expect(notificationViewSchema.safeParse(notificationView()).success).toBe(true);
    expect(notificationViewSchema.safeParse(notificationView({ type: "something_new", readAt: "2026-10-19T12:00:00.000Z" })).success).toBe(true);
  });
  it("rejects a malformed row (it would be an upstream contract error, never rendered)", () => {
    expect(notificationViewSchema.safeParse({ ...notificationView(), id: "nope" }).success).toBe(false);
    expect(notificationViewSchema.safeParse({ ...notificationView(), links: undefined }).success).toBe(false);
  });
  it("action input is an id only: no user id, read time or content", () => {
    expect(markReadInputSchema.safeParse({ id: NOTIFICATION_ID }).success).toBe(true);
    for (const bad of [{}, { id: "abc" }, { id: NOTIFICATION_ID, userId: "x" }, { id: NOTIFICATION_ID, readAt: "2020-01-01" }, { id: `${NOTIFICATION_ID}/x` }]) expect(markReadInputSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    expect(markAllReadInputSchema.safeParse({}).success).toBe(true);
    expect(markAllReadInputSchema.safeParse({ userId: "x" }).success).toBe(false);
  });
});

describe("failures", () => {
  const api = (status: number, retryAfterSeconds?: number) => new ApiError({ status, code: "x", message: "API says no", requestId: "req-1", ...(retryAfterSeconds ? { retryAfterSeconds } : {}) });
  it("maps each status to a kind and keeps secrets out", () => {
    expect(notificationFailureFrom(api(401))).toEqual({ kind: "unauthenticated" });
    expect(notificationFailureFrom(api(403))).toMatchObject({ kind: "forbidden" });
    expect(notificationFailureFrom(api(404))).toEqual({ kind: "not_found" });
    expect(notificationFailureFrom(api(429, 90))).toEqual({ kind: "rate_limited", retryAfterSeconds: 90 });
    expect(notificationFailureFrom(api(500))).toEqual({ kind: "unavailable", requestId: "req-1" });
    expect(notificationFailureFrom(new UpstreamUnavailableError("network"))).toEqual({ kind: "unavailable", requestId: null });
  });
  it("every notice says nothing was changed; an ended session links to sign-in and back", () => {
    for (const failure of [{ kind: "forbidden", message: "No." }, { kind: "not_found" }, { kind: "rate_limited", retryAfterSeconds: null }, { kind: "unavailable", requestId: null }] as const) {
      expect(notificationFailureNotice(failure, "/brand/notifications").text, failure.kind).toMatch(/Nothing was changed/);
    }
    expect(notificationFailureNotice({ kind: "unauthenticated" }, "/creator/notifications").link?.href).toBe("/sign-in?next=%2Fcreator%2Fnotifications&expired=1");
  });
});
