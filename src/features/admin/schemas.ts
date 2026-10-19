import { z } from "zod";

/**
 * What the browser may send to the admin Server Actions (reachable by a direct POST). STRICT: only the record id, the kind of decision and the
 * admin's own words. The new status, the actor, the reviewer and the permissions are never inputs: the API decides them from the session.
 */
const text = z.string().max(1100);

export const moderateInputSchema = z.strictObject({ id: z.uuid(), kind: z.enum(["suspend", "reactivate", "reject"]), reason: text.optional() });
export const decideInputSchema = z.strictObject({ id: z.uuid(), kind: z.enum(["approve", "reject"]), text: text.optional() });
export const releaseInputSchema = z.strictObject({ id: z.uuid() });

/** The lengths the API enforces (backend admin.schemas.ts / campaign.schemas.ts). */
export const LIMITS = {
  userReason: { min: 3, max: 500 },
  note: { min: 2, max: 1000 },
  rejectReason: { min: 5, max: 1000 },
} as const;

/** Trims and, for a single-line field, refuses line breaks. Returns the cleaned text, "" (nothing given) or an error message. */
export function checkText(value: string, limits: { min: number; max: number }, options: { required: boolean; singleLine?: boolean }): { ok: true; value: string } | { ok: false; message: string } {
  const trimmed = value.trim();
  if (!trimmed) return options.required ? { ok: false, message: `Write at least ${limits.min} characters.` } : { ok: true, value: "" };
  if (trimmed.length < limits.min) return { ok: false, message: `Write at least ${limits.min} characters.` };
  if (trimmed.length > limits.max) return { ok: false, message: `Keep it under ${limits.max} characters.` };
  if (options.singleLine && /[\r\n]/.test(trimmed)) return { ok: false, message: "Use a single line." };
  return { ok: true, value: trimmed };
}
