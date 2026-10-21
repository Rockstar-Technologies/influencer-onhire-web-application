import { z } from "zod";
import { PAYMENT_METHOD } from "@/lib/domain/vocabulary";

/**
 * What the browser may send to the payment Server Actions (reachable by a direct POST). STRICT: ids and the person's own words only. No owner, status,
 * amount (except the withdrawal amount the creator chooses), fee, net or balance is ever accepted; the API decides those.
 */
export const LIMITS = {
  summary: { min: 20, max: 1500 },
  link: { max: 300 },
  maxLinks: 5,
  disputeReason: { min: 5, max: 2000 },
  refundReason: { min: 5, max: 1000 },
} as const;

export const deliveryReportInputSchema = z.strictObject({
  id: z.uuid(),
  summary: z.string().max(LIMITS.summary.max + 100),
  links: z.array(z.string().max(LIMITS.link.max + 100)).max(LIMITS.maxLinks + 5),
});
export const brandDecisionInputSchema = z.strictObject({ id: z.uuid(), kind: z.enum(["acknowledge", "dispute", "withdraw_dispute"]), reason: z.string().max(2100).optional() });
export const refundRequestInputSchema = z.strictObject({ id: z.uuid(), reason: z.string().max(1100) });
export const idInputSchema = z.strictObject({ id: z.uuid() });
export const withdrawalInputSchema = z.strictObject({
  key: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/),
  amountXaf: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  method: z.enum(PAYMENT_METHOD.values),
});

/** One address per line; only plain http(s) addresses, as the API requires. Returns the cleaned list or an error message. */
export function parseLinks(raw: string): { ok: true; links: string[] } | { ok: false; message: string } {
  const lines = raw.split(/\s*\n\s*/).map((l) => l.trim()).filter(Boolean);
  return checkLinks(lines);
}

export function checkLinks(lines: string[]): { ok: true; links: string[] } | { ok: false; message: string } {
  const links = lines.map((l) => l.trim()).filter(Boolean);
  if (links.length === 0) return { ok: false, message: "Add at least one link to the content you posted." };
  if (links.length > LIMITS.maxLinks) return { ok: false, message: `Add up to ${LIMITS.maxLinks} links, one per line.` };
  if (new Set(links).size !== links.length) return { ok: false, message: "Each link must be different." };
  for (const link of links) {
    try {
      const url = new URL(link);
      if ((url.protocol !== "https:" && url.protocol !== "http:") || link.length > LIMITS.link.max || url.username || url.password) throw new Error();
    } catch {
      return { ok: false, message: "Each line must be a full web address starting with https://" };
    }
  }
  return { ok: true, links };
}

export function checkWords(value: string, limits: { min: number; max: number }): { ok: true; value: string } | { ok: false; message: string } {
  const trimmed = value.trim();
  if (trimmed.length < limits.min) return { ok: false, message: `Write at least ${limits.min} characters.` };
  if (trimmed.length > limits.max) return { ok: false, message: `Keep it under ${limits.max} characters.` };
  return { ok: true, value: trimmed };
}

export const newWithdrawalKey = () => `wd-${globalThis.crypto.randomUUID()}`;
