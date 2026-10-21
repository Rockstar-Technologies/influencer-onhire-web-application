import { z } from "zod";
import { PLATFORM } from "@/lib/domain/vocabulary";

/** What the browser may send: a campaign id, one of the four platform codes, a whole price and the pitch. No creator, brand, status or date. */
export const applyInputSchema = z.strictObject({
  campaignId: z.uuid(),
  platform: z.enum(PLATFORM.values),
  priceXaf: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  pitch: z.string().max(2000),
});
export const withdrawInputSchema = z.strictObject({ id: z.uuid() });
