import { z } from "zod";
import { HIRE_DURATION, PAYMENT_METHOD, PLATFORM } from "@/lib/domain/vocabulary";

/**
 * Shape checks for what the browser sends to the offer Server Actions (they are reachable by a direct POST). STRICT: no brand id, creator id,
 * price, status or date of the engagement is accepted: the API takes the brand and creator from the session and the username, and the price
 * from the creator's rate. Value rules the API owns are left to the API.
 */
export const hireInputSchema = z.strictObject({
  username: z.string().regex(/^[A-Za-z0-9._]{3,30}$/),
  values: z.strictObject({
    fullName: z.string().max(300),
    location: z.string().max(300),
    socialHandle: z.string().max(100),
    promotion: z.string().max(2000),
    platform: z.enum(PLATFORM.values),
    paymentMethod: z.enum(PAYMENT_METHOD.values),
    duration: z.enum(HIRE_DURATION.values),
  }),
});

export const creatorAnswerSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("accept"), id: z.uuid(), startDate: z.string().max(10).nullable() }),
  z.strictObject({ kind: z.literal("decline"), id: z.uuid(), reasonId: z.number().int().positive().max(32767) }),
]);

export const brandDecisionSchema = z.strictObject({ id: z.uuid(), kind: z.enum(["accept", "decline", "cancel"]) });
