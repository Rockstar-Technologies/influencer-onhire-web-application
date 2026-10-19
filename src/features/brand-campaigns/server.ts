import "server-only";
import { notFound, redirect } from "next/navigation";
import { ENDPOINTS, isUuid } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { CampaignListItem, CampaignOptions, CampaignView } from "@/lib/api/schemas";
import { callWithSession } from "@/lib/auth/api-session";
import { signInUrl } from "@/lib/auth/paths";
import type { CampaignStatus } from "@/lib/domain/vocabulary";
import { CAMPAIGN_STATUS } from "@/lib/domain/vocabulary";

export const CAMPAIGNS_PATH = "/brand/campaigns";
export const NEW_CAMPAIGN_PATH = "/campaigns/new";
export const PAGE_SIZE = 20;

/** A 401 means the session ended since the page guard ran: send the person to sign in and back. Any other failure goes to the error page. */
async function guarded<T>(returnTo: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(signInUrl({ next: returnTo, expired: true }));
    throw error;
  }
}

export function loadCampaignOptions(returnTo: string): Promise<CampaignOptions> {
  return guarded(returnTo, async () => (await callWithSession(ENDPOINTS.campaignOptions)).data);
}

export interface CampaignPage {
  items: CampaignListItem[];
  nextCursor: string | null;
  status: CampaignStatus | null;
}

/** One page of the brand's own campaigns (the API scopes the list to the session brand). `status` and `cursor` come from the URL and are validated. */
export function loadCampaigns(input: { status?: string; cursor?: string }): Promise<CampaignPage> {
  const status = CAMPAIGN_STATUS.is(input.status) ? input.status : null;
  const cursor = typeof input.cursor === "string" && /^[A-Za-z0-9_-]{1,500}$/.test(input.cursor) ? input.cursor : undefined;
  return guarded(CAMPAIGNS_PATH, async () => {
    const result = await callWithSession(ENDPOINTS.campaignList, undefined, {
      query: { limit: PAGE_SIZE, sort: "created_at", dir: "desc", ...(status ? { status } : {}), ...(cursor ? { cursor } : {}) },
    });
    const next = result.meta?.nextCursor;
    return { items: result.data, nextCursor: typeof next === "string" ? next : null, status };
  });
}

/** One of the brand's own campaigns. Missing, malformed ids and other brands' campaigns all end in the same "not found" page. */
export async function loadCampaign(id: string, returnTo: string): Promise<CampaignView> {
  if (!isUuid(id)) notFound(); // never sent to the API
  return guarded(returnTo, async () => {
    try {
      return (await callWithSession(ENDPOINTS.campaignGet, undefined, { id })).data.campaign;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || (error.status === 422 && error.code === "validation_failed"))) notFound();
      throw error;
    }
  });
}
