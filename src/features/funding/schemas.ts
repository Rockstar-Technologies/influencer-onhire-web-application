import { z } from "zod";
import { PAYMENT_METHOD } from "@/lib/domain/vocabulary";

/**
 * What the browser may send to the funding Server Actions (reachable by a direct POST). STRICT: no amount, status, provider, brand id or any evidence of
 * payment is accepted. The amount is the offer's price, set by the API; the only money-related inputs are the payment method and the payer's number.
 */
export const startFundingInputSchema = z.strictObject({
  offerId: z.uuid(),
  key: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/),
  paymentMethod: z.enum(PAYMENT_METHOD.values),
  payerPhone: z.string().max(30),
});

export const refreshFundingInputSchema = z.strictObject({ offerId: z.uuid() });
