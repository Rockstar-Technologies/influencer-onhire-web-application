import { z } from "zod";
import { AGE_RANGE } from "@/lib/domain/vocabulary";

/**
 * Shape checks for what the browser sends to the campaign Server Actions (they are reachable by a direct POST). STRICT: no brand id, status,
 * reviewer or owner field is accepted: the API derives the owner from the session and decides every status. Value rules the API owns
 * (budget limits, dates, reference data) are left to the API.
 */
export const campaignInputSchema = z.strictObject({
  title: z.string().max(300),
  niche: z.string().max(60),
  budgetXaf: z.number().int().finite(),
  startDate: z.string().max(10),
  endDate: z.string().max(10),
  deliverables: z.string().max(5000),
  minEngagementPct: z.number().int().nullable(),
  cities: z.array(z.string().max(60)).max(30),
  interests: z.array(z.string().max(60)).max(30),
  ageRanges: z.array(z.enum(AGE_RANGE.values)).max(10),
  imageFileIds: z.array(z.uuid()).max(5),
});

export const saveInputSchema = z.strictObject({ id: z.uuid().nullable(), campaign: campaignInputSchema, submit: z.boolean() });
export const transitionInputSchema = z.strictObject({ id: z.uuid(), kind: z.enum(["submit", "cancel", "delete"]) });
