"use server";

import { ENDPOINTS } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { OfferView } from "@/lib/api/schemas";
import { authorizeAction } from "@/lib/auth/action-access";
import { callWithSession } from "@/lib/auth/api-session";
import { applyFailureFrom } from "./failure";
import type { ApplyFailure } from "./failure";
import { PITCH_MAX, PITCH_MIN } from "./query";
import { applyInputSchema, withdrawInputSchema } from "./schemas";

/**
 * Server Actions for a creator applying to an open campaign and withdrawing a pending application. Each checks the signed-in ACTIVE creator first, validates
 * the shape strictly (no creator, brand, status or date is an input) and calls the API with the session. The window is the campaign's own dates; the price
 * must not exceed the brand's maximum (the API checks that and its minimum again). Nothing is reported as done unless the API confirmed it.
 */
const invalid: ApplyFailure = { kind: "validation", fields: {}, message: "Some details could not be read." };

async function gate(): Promise<ApplyFailure | null> {
  const access = await authorizeAction({ role: "creator" }, { clearInvalidSession: false });
  if (access.ok) return null;
  return access.reason === "anonymous" ? { kind: "unauthenticated" } : { kind: "forbidden", message: access.message };
}

export type ApplyOutcome = { ok: true; offer: OfferView } | { ok: false; error: ApplyFailure };

export async function applyToCampaignAction(input: unknown): Promise<ApplyOutcome> {
  const denied = await gate();
  if (denied) return { ok: false, error: denied };
  const parsed = applyInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalid };
  const { campaignId, platform, priceXaf, pitch } = parsed.data;
  const text = pitch.trim();
  if (text.length < PITCH_MIN || text.length > PITCH_MAX) return { ok: false, error: { kind: "validation", fields: { pitch: `Write between ${PITCH_MIN} and ${PITCH_MAX} characters.` }, message: null } };
  try {
    return { ok: true, offer: (await callWithSession(ENDPOINTS.creatorApply, { platform, priceXaf, pitch: text }, { id: campaignId })).data.offer };
  } catch (error) {
    // A repeated click or second tab: the API refuses a second application. It is success only if the campaign now shows MY pending application.
    if (error instanceof ApiError && error.status === 409 && error.code === "offer_already_exists") {
      try {
        const mine = (await callWithSession(ENDPOINTS.creatorCampaign, undefined, { id: campaignId })).data.campaign.myOffer;
        if (mine?.status === "pending") {
          const offer = (await callWithSession(ENDPOINTS.creatorOffer, undefined, { id: mine.id })).data.offer;
          if (offer.pitch === text && offer.priceXaf === priceXaf && offer.platform?.code === platform) return { ok: true, offer };
        }
      } catch {
        // fall through to the conflict below
      }
    }
    return { ok: false, error: applyFailureFrom(error) };
  }
}

/** Withdraws one of the creator's own PENDING applications. A repeat is success only if the offer now reads `withdrawn`. */
export async function withdrawApplicationAction(input: unknown): Promise<ApplyOutcome> {
  const denied = await gate();
  if (denied) return { ok: false, error: denied };
  const parsed = withdrawInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalid };
  const { id } = parsed.data;
  try {
    return { ok: true, offer: (await callWithSession(ENDPOINTS.creatorWithdraw, {}, { id })).data.offer };
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      try {
        const offer = (await callWithSession(ENDPOINTS.creatorOffer, undefined, { id })).data.offer;
        if (offer.status === "withdrawn") return { ok: true, offer };
      } catch {
        // fall through to the conflict below
      }
    }
    return { ok: false, error: applyFailureFrom(error) };
  }
}
