"use server";

import { ENDPOINTS } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { CampaignView } from "@/lib/api/schemas";
import { authorizeAction } from "@/lib/auth/action-access";
import { callWithSession } from "@/lib/auth/api-session";
import { campaignFailureFrom } from "./failure";
import type { CampaignFailure } from "./failure";
import { saveInputSchema, transitionInputSchema } from "./schemas";

/**
 * Server Actions for the brand's campaigns. Each one checks the signed-in ACTIVE brand first, validates the shape of the input (strictly: no
 * owner, status or reviewer field is accepted), and calls the Express API with the session. The owner is never named in a request: the API
 * derives it from the session and answers 404 for another brand's campaign. Nothing is reported as done unless the API confirmed it.
 */
const BRAND_ONLY = { role: "brand" } as const;
const invalidInput: CampaignFailure = { kind: "validation", fields: {}, message: "Some details could not be read. Please check the form and try again." };

async function gate(): Promise<CampaignFailure | null> {
  // The stale cookie is kept on purpose: removing it would make Next.js refresh the page and the person would lose what they typed.
  const access = await authorizeAction(BRAND_ONLY, { clearInvalidSession: false });
  if (access.ok) return null;
  return access.reason === "anonymous" ? { kind: "unauthenticated" } : { kind: "forbidden", message: access.message };
}

export type SaveOutcome =
  | { ok: true; campaign: CampaignView; submitted: boolean }
  | { ok: false; error: CampaignFailure; /** Set when the draft was saved before the failure (so it is not lost or created twice). */ savedId: string | null };

/**
 * Saves the campaign as a draft (creating it, or updating the draft `id`), and when `submit` is true then submits it for review. They are
 * two API calls, so a failure says which part succeeded: `savedId` is the draft that exists, and a retry updates THAT draft instead of
 * creating another. If the submit finds the campaign already submitted (a duplicate), the current state is returned as success.
 */
export async function saveCampaignAction(input: unknown): Promise<SaveOutcome> {
  const denied = await gate();
  if (denied) return { ok: false, error: denied, savedId: null };
  const parsed = saveInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput, savedId: null };
  const { id, campaign: body, submit } = parsed.data;

  let savedId = id;
  let view: CampaignView;
  try {
    if (id === null) {
      view = (await callWithSession(ENDPOINTS.campaignCreate, body)).data.campaign;
      savedId = view.id;
    } else {
      view = (await callWithSession(ENDPOINTS.campaignUpdate, body, { id })).data.campaign;
    }
  } catch (error) {
    return { ok: false, error: campaignFailureFrom(error), savedId: null };
  }
  if (!submit) return { ok: true, campaign: view, submitted: false };

  try {
    view = (await callWithSession(ENDPOINTS.campaignSubmit, {}, { id: savedId as string })).data.campaign;
    return { ok: true, campaign: view, submitted: true };
  } catch (error) {
    if (error instanceof ApiError && error.status === 409 && error.code === "campaign_not_draft") {
      // Already submitted (a repeated click or another tab): report what the server holds.
      try {
        const current = (await callWithSession(ENDPOINTS.campaignGet, undefined, { id: savedId as string })).data.campaign;
        if (current.status === "pending_review") return { ok: true, campaign: current, submitted: true };
      } catch {
        // fall through to the failure below
      }
    }
    return { ok: false, error: campaignFailureFrom(error), savedId };
  }
}

export type TransitionOutcome = { ok: true; campaign: CampaignView | null; deleted: boolean } | { ok: false; error: CampaignFailure };

/** The lifecycle actions on an existing campaign: submit a draft, cancel (withdraw) a submitted or open campaign, delete a draft. */
export async function transitionCampaignAction(input: unknown): Promise<TransitionOutcome> {
  const denied = await gate();
  if (denied) return { ok: false, error: denied };
  const parsed = transitionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  const { id, kind } = parsed.data;
  try {
    if (kind === "delete") {
      await callWithSession(ENDPOINTS.campaignDelete, undefined, { id });
      return { ok: true, campaign: null, deleted: true };
    }
    const endpoint = kind === "submit" ? ENDPOINTS.campaignSubmit : ENDPOINTS.campaignCancel;
    return { ok: true, campaign: (await callWithSession(endpoint, {}, { id })).data.campaign, deleted: false };
  } catch (error) {
    return { ok: false, error: campaignFailureFrom(error) };
  }
}
