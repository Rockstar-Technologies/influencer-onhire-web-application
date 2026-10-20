import "server-only";
import { notFound, redirect } from "next/navigation";
import { ENDPOINTS, isUuid } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { CreatorCampaign, CreatorCampaignFilters, OfferView } from "@/lib/api/schemas";
import { callWithSession } from "@/lib/auth/api-session";
import { signInUrl } from "@/lib/auth/paths";
import { toApiQuery } from "./query";
import type { CampaignQuery } from "./query";

export const PAGE_SIZE = 12;
export const CAMPAIGNS_PATH = "/creator/campaigns";

async function guarded<T>(returnTo: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(signInUrl({ next: returnTo, expired: true }));
    throw error;
  }
}

export interface CampaignPage {
  items: CreatorCampaign[];
  nextCursor: string | null;
}

/** One page of the open campaigns this creator may see (the API filters out everything else). A failure reaches the error page, never "no campaigns". */
export function loadCampaigns(query: CampaignQuery): Promise<CampaignPage> {
  return guarded(CAMPAIGNS_PATH, async () => {
    const result = await callWithSession(ENDPOINTS.creatorCampaigns, undefined, { query: toApiQuery(query, PAGE_SIZE) });
    const next = result.meta?.nextCursor;
    return { items: result.data, nextCursor: typeof next === "string" ? next : null };
  });
}

export function loadFilters(): Promise<CreatorCampaignFilters> {
  return guarded(CAMPAIGNS_PATH, async () => (await callWithSession(ENDPOINTS.creatorCampaignFilters)).data);
}

/** One open campaign. A campaign that is not open (or never existed, or belongs to a suspended brand), and a malformed id, are the same "not found". */
export async function loadCampaign(id: string): Promise<CreatorCampaign> {
  if (!isUuid(id)) notFound();
  return guarded(`${CAMPAIGNS_PATH}/${id}`, async () => {
    try {
      return (await callWithSession(ENDPOINTS.creatorCampaign, undefined, { id })).data.campaign;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || (error.status === 422 && error.code === "validation_failed"))) notFound();
      throw error;
    }
  });
}

/** The creator's own platforms and current rates (what they can apply with). */
export function loadMyPlatforms(returnTo: string) {
  return guarded(returnTo, async () => (await callWithSession(ENDPOINTS.creatorProfile)).data.profile.platforms);
}

/**
 * The creator's own offer on a campaign. `myOffer` on a campaign does not say WHO started it: a platform invitation (answered in the requests inbox) and
 * the creator's own application (withdrawable) look the same there, so the offer itself is read to tell them apart.
 */
export function loadMyOffer(offerId: string, returnTo: string): Promise<OfferView> {
  return guarded(returnTo, async () => (await callWithSession(ENDPOINTS.creatorOffer, undefined, { id: offerId })).data.offer);
}
