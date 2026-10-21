import "server-only";
import { redirect } from "next/navigation";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { ApplicationOptions, ApplicationState } from "@/lib/api/schemas";
import { callWithSession } from "@/lib/auth/api-session";
import { signInUrl } from "@/lib/auth/paths";

export interface WizardData {
  state: ApplicationState;
  options: ApplicationOptions;
}

export const APPLY_BASE = "/for-creators/apply";
export const SUBMITTED_PATH = `${APPLY_BASE}/submitted`;

/**
 * Loads the creator's application (creating the empty draft if they have none yet: the API does that) and the option lists, for the signed-in
 * creator. A 401 means the session ended since the page guard ran: send them to sign in and back. Any other failure is thrown to the error page.
 */
export async function loadWizard(returnTo: string): Promise<WizardData> {
  try {
    const [current, options] = await Promise.all([callWithSession(ENDPOINTS.applicationCurrent), callWithSession(ENDPOINTS.applicationOptions)]);
    return { state: current.data, options: options.data };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(signInUrl({ next: returnTo, expired: true }));
    throw error;
  }
}

/** The step a draft should be on next (the API's own `nextStep`; "submit" means the last step). */
export function pathForNextStep(state: ApplicationState): string {
  const step = state.nextStep;
  return step === "profile" || step === "audience" || step === "rates" ? `${APPLY_BASE}/${step}` : `${APPLY_BASE}/rates`;
}
