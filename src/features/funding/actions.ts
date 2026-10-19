"use server";

import { ENDPOINTS } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { FundingView } from "@/lib/api/schemas";
import { authorizeAction } from "@/lib/auth/action-access";
import { callWithSession } from "@/lib/auth/api-session";
import { fundFailureFrom } from "./failure";
import type { FundFailure } from "./failure";
import { fundToApi } from "./mapping";
import { refreshFundingInputSchema, startFundingInputSchema } from "./schemas";

/**
 * Server Actions for paying for an accepted booking. Each checks the signed-in ACTIVE brand first and validates the shape of the input strictly. The
 * amount is never an input: the API pays exactly the offer's price. Nothing is reported as paid unless the API says so (a `funded` status with a payment),
 * and the API only says so after verified confirmation from the payment provider. No real provider is connected in this build.
 */
const invalidInput: FundFailure = { kind: "validation", fields: {}, message: "Some details could not be read. Please check the form and try again." };

async function gate(): Promise<FundFailure | null> {
  // The stale cookie is kept on purpose so the page stays as it is and offers "Sign in again".
  const access = await authorizeAction({ role: "brand" }, { clearInvalidSession: false });
  if (access.ok) return null;
  return access.reason === "anonymous" ? { kind: "unauthenticated" } : { kind: "forbidden", message: access.message };
}

export type FundingOutcome = { ok: true; funding: FundingView; replayed: boolean } | { ok: false; error: FundFailure };

async function current(offerId: string): Promise<FundingView> {
  return (await callWithSession(ENDPOINTS.brandFunding, undefined, { id: offerId })).data.funding;
}

/**
 * Starts (or, with the same key, repeats) the payment for one offer. The `key` is the Idempotency-Key of this payment intent: repeating a request with the
 * same key can never charge twice. A 409 saying the booking is already paid, or that a payment is already in progress, is turned into the current state only
 * when a fresh read confirms it; otherwise the conflict is reported as it is.
 */
export async function startFundingAction(input: unknown): Promise<FundingOutcome> {
  const denied = await gate();
  if (denied) return { ok: false, error: denied };
  const parsed = startFundingInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const { offerId, key, paymentMethod, payerPhone } = parsed.data;
  try {
    const result = await callWithSession(ENDPOINTS.brandFund, fundToApi({ paymentMethod, payerPhone }), { id: offerId, idempotencyKey: key });
    return { ok: true, funding: result.data.funding, replayed: result.data.replayed };
  } catch (error) {
    if (error instanceof ApiError && error.status === 409 && (error.code === "already_funded" || error.code === "funding_in_progress")) {
      try {
        const funding = await current(offerId);
        if ((error.code === "already_funded" && funding.status === "funded") || (error.code === "funding_in_progress" && (funding.status === "awaiting_confirmation" || funding.status === "indeterminate"))) {
          return { ok: true, funding, replayed: true };
        }
      } catch {
        // fall through to the conflict below
      }
    }
    return { ok: false, error: fundFailureFrom(error) };
  }
}

/** Reads the current funding state of one of the brand's own offers ("Check status"). Changes nothing. */
export async function refreshFundingAction(input: unknown): Promise<{ ok: true; funding: FundingView } | { ok: false; error: FundFailure }> {
  const denied = await gate();
  if (denied) return { ok: false, error: denied };
  const parsed = refreshFundingInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  try {
    return { ok: true, funding: await current(parsed.data.offerId) };
  } catch (error) {
    return { ok: false, error: fundFailureFrom(error) };
  }
}
