"use server";

import { ENDPOINTS } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { OfferView } from "@/lib/api/schemas";
import { authorizeAction } from "@/lib/auth/action-access";
import { callWithSession } from "@/lib/auth/api-session";
import { offerFailureFrom } from "./failure";
import type { OfferFailure } from "./failure";
import { hireToApi, isCalendarDate } from "./mapping";
import { brandDecisionSchema, creatorAnswerSchema, hireInputSchema } from "./schemas";

/**
 * Server Actions for hiring and for answering offers. Each one checks the signed-in ACTIVE brand (or creator) first, validates the shape of the
 * input strictly (no owner, price or status is accepted), and calls the Express API with the session. Who owns an offer is decided by the API
 * (a stranger's offer is a 404). Nothing is reported as done unless the API confirmed it.
 */
const invalidInput: OfferFailure = { kind: "validation", fields: {}, message: "Some details could not be read. Please check the form and try again." };

async function gate(role: "brand" | "creator"): Promise<OfferFailure | null> {
  // The stale cookie is kept on purpose: removing it would make Next.js refresh the page and the person would lose what they typed.
  const access = await authorizeAction({ role }, { clearInvalidSession: false });
  if (access.ok) return null;
  return access.reason === "anonymous" ? { kind: "unauthenticated" } : { kind: "forbidden", message: access.message };
}

export type HireOutcome = { ok: true; offer: OfferView } | { ok: false; error: OfferFailure };

/** Sends a direct hire request. The price is the creator's current rate for the platform, set by the API (never sent). */
export async function submitHireAction(input: unknown): Promise<HireOutcome> {
  const denied = await gate("brand");
  if (denied) return { ok: false, error: denied };
  const parsed = hireInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  try {
    const result = await callWithSession(ENDPOINTS.brandHire, hireToApi(parsed.data.username, parsed.data.values));
    return { ok: true, offer: result.data.offer };
  } catch (error) {
    return { ok: false, error: offerFailureFrom(error) };
  }
}

/**
 * A repeated click (or a second tab) answers an offer that is already answered: the API says 409 offer_not_pending. If the offer now holds
 * exactly the status this request wanted, that is success (the same outcome, not an error); otherwise the conflict is reported.
 */
async function settled(error: unknown, wanted: OfferView["status"], read: () => Promise<OfferView>): Promise<{ ok: true; offer: OfferView } | { ok: false; error: OfferFailure }> {
  if (error instanceof ApiError && error.status === 409 && error.code === "offer_not_pending") {
    try {
      const current = await read();
      if (current.status === wanted) return { ok: true, offer: current };
    } catch {
      // fall through to the conflict below
    }
  }
  return { ok: false, error: offerFailureFrom(error) };
}

export type AnswerOutcome = { ok: true; offer: OfferView } | { ok: false; error: OfferFailure };

/** A creator accepts (a direct hire may carry the chosen start date) or declines (with a reason from the API's list) an offer addressed to them. */
export async function answerOfferAction(input: unknown): Promise<AnswerOutcome> {
  const denied = await gate("creator");
  if (denied) return { ok: false, error: denied };
  const parsed = creatorAnswerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const answer = parsed.data;
  const read = async () => (await callWithSession(ENDPOINTS.creatorOffer, undefined, { id: answer.id })).data.offer;
  try {
    if (answer.kind === "accept") {
      if (answer.startDate !== null && answer.startDate !== "" && !isCalendarDate(answer.startDate)) return { ok: false, error: invalidInput };
      const body = answer.startDate ? { startDate: answer.startDate } : {};
      return { ok: true, offer: (await callWithSession(ENDPOINTS.creatorOfferAccept, body, { id: answer.id })).data.offer };
    }
    return { ok: true, offer: (await callWithSession(ENDPOINTS.creatorOfferDecline, { reasonId: answer.reasonId }, { id: answer.id })).data.offer };
  } catch (error) {
    return settled(error, answer.kind === "accept" ? "accepted" : "declined", read);
  }
}

export type DecisionOutcome = { ok: true; offer: OfferView } | { ok: false; error: OfferFailure };

/** A brand accepts or declines a creator's application to its campaign, or cancels its own pending direct hire. */
export async function decideOfferAction(input: unknown): Promise<DecisionOutcome> {
  const denied = await gate("brand");
  if (denied) return { ok: false, error: denied };
  const parsed = brandDecisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const { id, kind } = parsed.data;
  const endpoint = kind === "accept" ? ENDPOINTS.brandOfferAccept : kind === "decline" ? ENDPOINTS.brandOfferDecline : ENDPOINTS.brandOfferCancel;
  const read = async () => (await callWithSession(ENDPOINTS.brandOffer, undefined, { id })).data.offer;
  try {
    return { ok: true, offer: (await callWithSession(endpoint, {}, { id })).data.offer };
  } catch (error) {
    return settled(error, kind === "accept" ? "accepted" : kind === "decline" ? "declined" : "cancelled", read);
  }
}
