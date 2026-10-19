import { describe, expect, it } from "vitest";
import * as labels from "@/lib/domain/labels";
import { labelOf, lookupOr } from "@/lib/domain/labels";
import * as v from "@/lib/domain/vocabulary";

/**
 * The canonical lists, written out by hand from the Express backend (migrations and zod schemas, verified when this milestone was done).
 * If the backend adds or renames a value this test, domain-contract.test.ts and the TypeScript build all point at the places to update.
 */
const EXPECTED = {
  ROLE: ["brand", "creator", "admin"],
  ACCOUNT_TYPE: ["brand", "creator"],
  ACCOUNT_STATUS: ["pending", "active", "suspended", "rejected"],
  APPLICATION_STATUS: ["draft", "under_review", "approved", "rejected"],
  ADMIN_ROLE: ["super_admin", "campaign_manager", "finance", "support_agent"],
  CAMPAIGN_STATUS: ["draft", "pending_review", "open", "accepted", "in_progress", "completed", "rejected", "cancelled"],
  OFFER_STATUS: ["pending", "accepted", "declined", "withdrawn", "cancelled", "expired", "funding_expired", "refunded"],
  OFFER_ORIGIN: ["direct_hire", "campaign_match"],
  OFFER_INITIATOR: ["platform", "brand", "creator"],
  PAYMENT_STATUS: ["held", "requested", "released", "refund_pending", "refunded"],
  DISPUTE_STATUS: ["open", "withdrawn", "resolved_in_favour", "resolved_against"],
  REFUND_STATUS: ["pending", "completed", "cancelled"],
  REFUND_REQUEST_STATUS: ["requested", "accepted", "rejected", "withdrawn"],
  WITHDRAWAL_STATUS: ["requested", "under_review", "approved", "rejected", "cancelled", "processing", "completed", "failed"],
  PAYMENT_METHOD: ["mtn_momo", "orange_money"],
  PLATFORM: ["facebook", "instagram", "tiktok", "youtube"],
  LANGUAGE: ["english", "french", "bilingual"],
  DEPOSIT_TERMS: ["deposit_50_balance_on_delivery", "full_in_escrow"],
  AGE_RANGE: ["18-24", "25-34", "35-44", "45-plus"],
  HIRE_DURATION: ["1-week", "2-weeks", "1-month", "2-months", "3-months-plus"],
  TICKET_STATUS: ["open", "in_progress", "resolved"],
  TICKET_PRIORITY: ["urgent", "normal", "low"],
  DOCUMENT_KIND: ["contract", "tax_id", "business_registration", "national_id"],
  DOCUMENT_STATUS: ["verified", "in_review", "rejected"],
  ALERT_KIND: ["failed_logins", "follower_spike", "payout_change"],
  ALERT_SEVERITY: ["high", "medium"],
  FLAG_FIELD: ["bio", "campaign_description", "media"],
  FLAG_RESOLUTION: ["removed", "dismissed"],
} as const;

type Defined = { values: readonly string[]; is: (value: unknown) => boolean };
const define = (name: keyof typeof EXPECTED) => (v as unknown as Record<string, Defined>)[name]!;

describe("canonical API vocabulary", () => {
  it.each(Object.entries(EXPECTED))("%s matches the backend contract", (name, expected) => {
    expect(define(name as keyof typeof EXPECTED).values).toEqual(expected);
  });

  it("lists the 19 permission codes the API seeds", () => {
    expect([...v.PERMISSION.values].sort()).toEqual(
      [
        "alerts.manage", "applications.review", "audit.view", "campaigns.review", "dashboard.export", "dashboard.view", "disputes.uphold", "moderation.manage",
        "payments.refund", "payments.release", "payments.view", "profiles.verify", "reconciliation.resolve", "settings.manage", "team.manage", "tickets.manage",
        "users.moderate", "users.view", "withdrawals.review",
      ].sort(),
    );
    expect(v.PERMISSION.values).toHaveLength(19);
  });

  it("minimum engagement is 3, 5 or 7 percent", () => {
    expect(v.MIN_ENGAGEMENT_PCT).toEqual([3, 5, 7]);
  });

  it.each(Object.keys(EXPECTED))("%s has no duplicates and its guard accepts exactly its values", (name) => {
    const list = define(name as keyof typeof EXPECTED);
    expect(new Set(list.values).size).toBe(list.values.length);
    for (const value of list.values) expect(list.is(value)).toBe(true);
    for (const bad of ["", " ", "unknown", "influencer", "Creator", "ACTIVE", null, undefined, 3, {}, [], list.values[0] + " "]) expect(list.is(bad)).toBe(false);
  });

  it("a creator is never called an influencer in the API vocabulary", () => {
    expect(v.ROLE.is("influencer")).toBe(false);
    expect(v.ACCOUNT_TYPE.is("influencer")).toBe(false);
    expect(v.OFFER_INITIATOR.is("influencer")).toBe(false);
  });

  it("API codes use snake_case (or the documented hyphenated slugs), never the old kebab-case spellings", () => {
    const snake = ["APPLICATION_STATUS", "CAMPAIGN_STATUS", "OFFER_STATUS", "PAYMENT_STATUS", "DISPUTE_STATUS", "WITHDRAWAL_STATUS", "TICKET_STATUS", "DOCUMENT_KIND", "DOCUMENT_STATUS", "ALERT_KIND", "FLAG_FIELD", "ADMIN_ROLE"] as const;
    for (const name of snake) for (const value of define(name).values) expect(value, `${name}.${value}`).toMatch(/^[a-z]+(?:_[a-z0-9]+)*$/);
  });

  it("the distinct lifecycle statuses stay distinct (nothing is collapsed)", () => {
    expect(v.OFFER_STATUS.is("cancelled")).toBe(true);
    expect(v.OFFER_STATUS.is("withdrawn")).toBe(true);
    expect(v.OFFER_STATUS.is("expired")).toBe(true);
    expect(v.OFFER_STATUS.is("funding_expired")).toBe(true);
    expect(v.PAYMENT_STATUS.is("refund_pending")).toBe(true);
    expect(v.WITHDRAWAL_STATUS.is("under_review")).toBe(true);
    expect(v.DISPUTE_STATUS.is("withdrawn")).toBe(true);
  });
});

describe("labels", () => {
  const PAIRS: [string, Record<string, string>, readonly string[]][] = [
    ["ACCOUNT_TYPE", labels.ACCOUNT_TYPE_LABELS, v.ACCOUNT_TYPE.values],
    ["ACCOUNT_STATUS", labels.ACCOUNT_STATUS_LABELS, v.ACCOUNT_STATUS.values],
    ["APPLICATION_STATUS", labels.APPLICATION_STATUS_LABELS, v.APPLICATION_STATUS.values],
    ["ADMIN_ROLE", labels.ADMIN_ROLE_LABELS, v.ADMIN_ROLE.values],
    ["CAMPAIGN_STATUS", labels.CAMPAIGN_STATUS_LABELS, v.CAMPAIGN_STATUS.values],
    ["OFFER_STATUS", labels.OFFER_STATUS_LABELS, v.OFFER_STATUS.values],
    ["PAYMENT_STATUS", labels.PAYMENT_STATUS_LABELS, v.PAYMENT_STATUS.values],
    ["DISPUTE_STATUS", labels.DISPUTE_STATUS_LABELS, v.DISPUTE_STATUS.values],
    ["REFUND_STATUS", labels.REFUND_STATUS_LABELS, v.REFUND_STATUS.values],
    ["REFUND_REQUEST_STATUS", labels.REFUND_REQUEST_STATUS_LABELS, v.REFUND_REQUEST_STATUS.values],
    ["WITHDRAWAL_STATUS", labels.WITHDRAWAL_STATUS_LABELS, v.WITHDRAWAL_STATUS.values],
    ["PAYMENT_METHOD", labels.PAYMENT_METHOD_LABELS, v.PAYMENT_METHOD.values],
    ["LANGUAGE", labels.LANGUAGE_LABELS, v.LANGUAGE.values],
    ["AGE_RANGE", labels.AGE_RANGE_LABELS, v.AGE_RANGE.values],
    ["DEPOSIT_TERMS", labels.DEPOSIT_TERMS_LABELS, v.DEPOSIT_TERMS.values],
    ["TICKET_STATUS", labels.TICKET_STATUS_LABELS, v.TICKET_STATUS.values],
    ["TICKET_PRIORITY", labels.TICKET_PRIORITY_LABELS, v.TICKET_PRIORITY.values],
    ["DOCUMENT_KIND", labels.DOCUMENT_KIND_LABELS, v.DOCUMENT_KIND.values],
    ["DOCUMENT_STATUS", labels.DOCUMENT_STATUS_LABELS, v.DOCUMENT_STATUS.values],
    ["ALERT_KIND", labels.ALERT_KIND_LABELS, v.ALERT_KIND.values],
    ["FLAG_FIELD", labels.FLAG_FIELD_LABELS, v.FLAG_FIELD.values],
  ];

  it.each(PAIRS)("%s has a non-empty label for every code and no extra keys", (_name, table, codes) => {
    expect(Object.keys(table).sort()).toEqual([...codes].sort());
    for (const code of codes) expect(table[code]!.trim().length).toBeGreaterThan(0);
  });

  it("keeps the user-facing wording that existed before the vocabulary was unified", () => {
    expect(labels.PAYMENT_METHOD_LABELS).toEqual({ mtn_momo: "MTN MoMo", orange_money: "Orange Money" });
    expect(labels.ADMIN_ROLE_LABELS.super_admin).toBe("Super Admin");
    expect(labels.AGE_RANGE_LABELS["45-plus"]).toBe("45+");
    expect(labels.LANGUAGE_LABELS.bilingual).toBe("Bilingual");
  });

  it("the 50% deposit wording stays informational and the full-escrow wording is unchanged", () => {
    expect(labels.DEPOSIT_TERMS_LABELS.full_in_escrow).toBe("Full amount held in escrow until delivery");
    expect(labels.DEPOSIT_TERMS_LABELS.deposit_50_balance_on_delivery).toBe("50% deposit, balance on delivery");
  });

  it("labelOf and lookupOr never throw on unexpected API values", () => {
    expect(labelOf(labels.PAYMENT_STATUS_LABELS, "held")).toBe("On hold (escrow)");
    for (const unexpected of ["brand_new_status", "", null, undefined, 7, {}, "__proto__", "constructor", "toString"]) {
      expect(labelOf(labels.PAYMENT_STATUS_LABELS, unexpected)).toBe(labels.UNKNOWN_LABEL);
      expect(lookupOr({ a: 1 }, unexpected, 99)).toBe(99);
    }
    expect(labelOf(labels.PAYMENT_STATUS_LABELS, "nope", "n/a")).toBe("n/a");
    expect(lookupOr({ a: 1 }, "a", 99)).toBe(1);
  });
});
