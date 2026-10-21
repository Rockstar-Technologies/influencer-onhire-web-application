import { describe, expect, it } from "vitest";
import { parseApiDate } from "@/lib/domain/dates";
import { formatDate, formatFcfa } from "@/lib/format";
import { formatDate as formatShortDate } from "@/lib/utils";

describe("API dates", () => {
  it("reads calendar dates as local midnight, exactly as before", () => {
    const date = parseApiDate("2026-12-01")!;
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 11, 1, 0]);
    expect(formatDate("2026-12-01")).toBe("Dec 1, 2026");
  });

  it("reads full UTC timestamps from the API (which the old date-only helper turned into 'Invalid Date')", () => {
    expect(parseApiDate("2026-10-19T00:06:02.961Z")?.toISOString()).toBe("2026-10-19T00:06:02.961Z");
    expect(formatDate("2026-10-19T12:00:00.000Z")).toMatch(/Oct 19, 2026/);
    expect(formatShortDate("2026-10-19T12:00:00.000Z")).toMatch(/19 Oct 2026/);
  });

  it.each(["", "not a date", "2026-13-45", null, undefined, 20261201, {}])("never returns an invalid date for %j", (value) => {
    expect(parseApiDate(value)).toBeNull();
  });

  it("shows a dash instead of 'Invalid Date' for an unreadable value", () => {
    expect(formatDate("garbage")).toBe("—");
    expect(formatDate("")).toBe("—");
  });
});

describe("money", () => {
  it("the API sends whole XAF; screens show them with the FCFA/CFA label and never invent decimals", () => {
    expect(formatFcfa(1_200_000)).toBe("1,200,000 FCFA");
    expect(formatFcfa(0)).toBe("0 FCFA");
    expect(Number.isInteger(10_000)).toBe(true);
  });
});
