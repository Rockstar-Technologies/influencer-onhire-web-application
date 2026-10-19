import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as v from "@/lib/domain/vocabulary";

/**
 * Drift check against the REAL backend, when its repository is checked out next to this one (influencer-onhire-web/backend).
 * It rebuilds every PostgreSQL enum from the migrations (CREATE TYPE plus every later ALTER TYPE ... ADD VALUE) and reads the seeded
 * reference codes, then requires the frontend's canonical lists to match exactly. Without the backend checkout the suite is skipped.
 */
const BACKEND = path.resolve(import.meta.dirname, "../../../influencer-onhire-web/backend");
const present = existsSync(path.join(BACKEND, "migrations"));

function enumsFromMigrations(): Map<string, string[]> {
  const files = readdirSync(path.join(BACKEND, "migrations")).filter((f) => f.endsWith(".sql")).sort();
  const enums = new Map<string, string[]>();
  for (const file of files) {
    const sql = readFileSync(path.join(BACKEND, "migrations", file), "utf8").replace(/--[^\n]*/g, "");
    for (const match of sql.matchAll(/CREATE TYPE\s+(\w+)\s+AS\s+ENUM\s*\(([^)]*)\)/gi)) {
      enums.set(match[1] as string, [...(match[2] as string).matchAll(/'([^']+)'/g)].map((m) => m[1] as string));
    }
    for (const match of sql.matchAll(/ALTER TYPE\s+(\w+)\s+ADD VALUE(?:\s+IF NOT EXISTS)?\s+'([^']+)'/gi)) {
      const list = enums.get(match[1] as string);
      if (list && !list.includes(match[2] as string)) list.push(match[2] as string);
    }
  }
  return enums;
}

const sameSet = (actual: readonly string[], expected: readonly string[]) => expect([...actual].sort()).toEqual([...expected].sort());

describe.skipIf(!present)("frontend vocabulary matches the backend repository", () => {
  const enums = present ? enumsFromMigrations() : new Map<string, string[]>();

  it.each([
    ["user_role", v.ROLE.values],
    ["account_status", v.ACCOUNT_STATUS.values],
    ["application_status", v.APPLICATION_STATUS.values],
    ["creator_language", v.LANGUAGE.values],
    ["deposit_terms", v.DEPOSIT_TERMS.values],
    ["campaign_status", v.CAMPAIGN_STATUS.values],
    ["offer_status", v.OFFER_STATUS.values],
    ["offer_origin", v.OFFER_ORIGIN.values],
    ["offer_initiator", v.OFFER_INITIATOR.values],
    ["payment_status", v.PAYMENT_STATUS.values],
    ["dispute_status", v.DISPUTE_STATUS.values],
    ["refund_status", v.REFUND_STATUS.values],
    ["refund_request_status", v.REFUND_REQUEST_STATUS.values],
    ["withdrawal_status", v.WITHDRAWAL_STATUS.values],
    ["ticket_status", v.TICKET_STATUS.values],
    ["ticket_priority", v.TICKET_PRIORITY.values],
    ["document_kind", v.DOCUMENT_KIND.values],
    ["document_status", v.DOCUMENT_STATUS.values],
    ["alert_kind", v.ALERT_KIND.values],
    ["alert_severity", v.ALERT_SEVERITY.values],
    ["flag_field", v.FLAG_FIELD.values],
    ["flag_resolution", v.FLAG_RESOLUTION.values],
  ] as const)("enum %s", (name, values) => {
    const backend = enums.get(name);
    expect(backend, `${name} not found in the backend migrations`).toBeDefined();
    sameSet(values, backend as string[]);
  });

  it("reference codes seeded by the backend (platforms, payment methods, age ranges, durations, roles, permissions)", () => {
    const seed = readFileSync(path.join(BACKEND, "src/db/seeds/reference-data.ts"), "utf8");
    const codesIn = (block: RegExp) => [...(block.exec(seed)?.[0] ?? "").matchAll(/code: "([^"]+)"/g)].map((m) => m[1] as string);
    sameSet(v.PLATFORM.values, codesIn(/export const platforms[\s\S]*?\];/));
    sameSet(v.PAYMENT_METHOD.values, codesIn(/export const paymentMethods[\s\S]*?\];/));
    sameSet(v.AGE_RANGE.values, codesIn(/export const ageRanges[\s\S]*?\];/));
    sameSet(v.HIRE_DURATION.values, codesIn(/export const campaignDurations[\s\S]*?\];/));
    sameSet(v.ADMIN_ROLE.values, codesIn(/export const adminRoles[\s\S]*?\];/));
    sameSet(v.PERMISSION.values, codesIn(/export const permissions[\s\S]*?\];/));
  });

  it("the backend's engagement levels are 3, 5 and 7 percent", () => {
    const seed = readFileSync(path.join(BACKEND, "src/db/seeds/reference-data.ts"), "utf8");
    const block = /export const engagementLevels[\s\S]*?\];/.exec(seed)?.[0] ?? "";
    expect([...block.matchAll(/minPct: (\d+)/g)].map((m) => Number(m[1]))).toEqual([...v.MIN_ENGAGEMENT_PCT]);
  });
});
