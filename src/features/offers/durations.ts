import type { HireDurationCode } from "@/lib/domain/vocabulary";

/**
 * The durations a creator can be booked for. The API has no endpoint that lists them for brands, so the codes (checked against the backend
 * seed by tests/unit/domain-contract.test.ts), labels and day counts are kept here; the API re-checks the code and the creator's minimum booking.
 */
export interface HireDuration {
  value: HireDurationCode;
  label: string;
  days: number;
}

export const HIRE_DURATIONS: readonly HireDuration[] = [
  { value: "1-week", label: "1 week", days: 7 },
  { value: "2-weeks", label: "2 weeks", days: 14 },
  { value: "1-month", label: "1 month", days: 30 },
  { value: "2-months", label: "2 months", days: 60 },
  { value: "3-months-plus", label: "3+ months", days: 90 },
];

/** Durations at least as long as the creator's minimum booking (in days, from the API). */
export function durationsAtLeast(minimumDays: number): HireDuration[] {
  return HIRE_DURATIONS.filter((duration) => duration.days >= minimumDays);
}
