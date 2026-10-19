"use server";

import { ENDPOINTS } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { ApplicationState } from "@/lib/api/schemas";
import { authorizeAction } from "@/lib/auth/action-access";
import { callWithSession } from "@/lib/auth/api-session";
import { wizardFailureFrom } from "./failure";
import type { WizardFailure, WizardResult } from "./failure";
import { audienceInputSchema, profileInputSchema, ratesInputSchema, submitInputSchema } from "./schemas";

/**
 * Server Actions for the creator application wizard. Each one: (1) checks the signed-in creator (pending creators are allowed: this is the one
 * area they may use), (2) validates the shape of the input, (3) calls the Express API with the session (the creator is never named in a request:
 * the API derives it from the session), and (4) returns either the API's own view of the application or a safe, typed failure.
 * Nothing is reported as saved unless the API confirmed it.
 */
const CREATOR_ONLY = { role: "creator", allowPending: true } as const;

const unauthenticated: WizardFailure = { kind: "unauthenticated" };
const invalidInput: WizardFailure = { kind: "validation", fields: {}, steps: [], message: "Some details could not be read. Please check the form and try again." };

async function gate(): Promise<WizardFailure | null> {
  // The stale cookie is kept on purpose: removing it would make Next.js refresh the page and the person would lose what they typed. The form
  // says the session ended and links to sign-in; a fresh sign-in replaces the cookie.
  const access = await authorizeAction(CREATOR_ONLY, { clearInvalidSession: false });
  if (access.ok) return null;
  return access.reason === "anonymous" ? unauthenticated : { kind: "forbidden", message: access.message };
}

async function saveStep(
  endpoint: typeof ENDPOINTS.applicationSaveProfile | typeof ENDPOINTS.applicationSaveAudience | typeof ENDPOINTS.applicationSaveRates,
  schema: typeof profileInputSchema | typeof audienceInputSchema | typeof ratesInputSchema,
  step: "profile" | "audience" | "rates",
  input: unknown,
): Promise<WizardResult<ApplicationState>> {
  const denied = await gate();
  if (denied) return { ok: false, error: denied };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput };
  try {
    const result = await callWithSession(endpoint, parsed.data);
    return { ok: true, value: result.data };
  } catch (error) {
    return { ok: false, error: wizardFailureFrom(error, step) };
  }
}

export async function saveProfileAction(input: unknown) {
  return saveStep(ENDPOINTS.applicationSaveProfile, profileInputSchema, "profile", input);
}

export async function saveAudienceAction(input: unknown) {
  return saveStep(ENDPOINTS.applicationSaveAudience, audienceInputSchema, "audience", input);
}

export async function saveRatesAction(input: unknown) {
  return saveStep(ENDPOINTS.applicationSaveRates, ratesInputSchema, "rates", input);
}

export type SubmitOutcome = { ok: true; value: ApplicationState } | { ok: false; error: WizardFailure; ratesSaved: boolean };

/**
 * The last step: save the rates, then submit. They are two API calls, so a failure says which part succeeded (`ratesSaved`): the person is
 * never told their details were saved when they were not, or that submission failed when it did not. A repeated submit answers
 * `already_submitted` (409); that is reported as success with the current state because the application IS submitted.
 */
export async function submitApplicationAction(input: unknown): Promise<SubmitOutcome> {
  const denied = await gate();
  if (denied) return { ok: false, error: denied, ratesSaved: false };
  const parsed = submitInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidInput, ratesSaved: false };

  let ratesSaved = false;
  try {
    if (parsed.data.rates) {
      await callWithSession(ENDPOINTS.applicationSaveRates, parsed.data.rates);
      ratesSaved = true;
    }
    await callWithSession(ENDPOINTS.applicationSubmit, { confirmAccuracy: true });
  } catch (error) {
    if (error instanceof ApiError && error.status === 409 && error.code === "already_submitted") {
      try {
        return { ok: true, value: (await callWithSession(ENDPOINTS.applicationCurrent)).data };
      } catch (inner) {
        return { ok: false, error: wizardFailureFrom(inner), ratesSaved };
      }
    }
    return { ok: false, error: wizardFailureFrom(error, "rates"), ratesSaved };
  }
  try {
    return { ok: true, value: (await callWithSession(ENDPOINTS.applicationCurrent)).data };
  } catch (error) {
    // The submission itself succeeded; only reading the result back failed. The page will show the real status when it loads.
    return { ok: false, error: wizardFailureFrom(error), ratesSaved: true };
  }
}

/** After a rejection: start a new draft pre-filled from the rejected one (the API refuses it unless that is allowed). */
export async function reapplyAction(): Promise<WizardResult<ApplicationState>> {
  const denied = await gate();
  if (denied) return { ok: false, error: denied };
  try {
    await callWithSession(ENDPOINTS.applicationReapply, {});
    return { ok: true, value: (await callWithSession(ENDPOINTS.applicationCurrent)).data };
  } catch (error) {
    return { ok: false, error: wizardFailureFrom(error) };
  }
}
