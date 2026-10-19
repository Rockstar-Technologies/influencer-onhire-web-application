import "server-only";
import { notFound, redirect } from "next/navigation";
import { ENDPOINTS, isUsername } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { DeclineReason, HireCreator, OfferView } from "@/lib/api/schemas";
import { callWithSession } from "@/lib/auth/api-session";
import { signInUrl } from "@/lib/auth/paths";
import { OFFER_STATUS } from "@/lib/domain/vocabulary";
import type { OfferStatus } from "@/lib/domain/vocabulary";

export const CREATOR_REQUESTS_PATH = "/creator/requests";
export const BRAND_OFFERS_PATH = "/brand/offers";
export const PAGE_SIZE = 20;
export const PENDING_LIMIT = 50;

/** A 401 means the session ended since the page guard ran: send the person to sign in and back. Any other failure goes to the error page. */
async function guarded<T>(returnTo: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(signInUrl({ next: returnTo, expired: true }));
    throw error;
  }
}

const cursorOf = (value: unknown) => (typeof value === "string" && /^[A-Za-z0-9_=-]{1,500}$/.test(value) ? value : undefined);

export interface OfferPage {
  items: OfferView[];
  nextCursor: string | null;
}

async function page(endpoint: typeof ENDPOINTS.creatorOffers | typeof ENDPOINTS.brandOffers, query: Record<string, string | number | undefined>): Promise<OfferPage> {
  const result = await callWithSession(endpoint, undefined, { query });
  const next = result.meta?.nextCursor;
  return { items: result.data, nextCursor: typeof next === "string" ? next : null };
}

export interface CreatorInbox {
  /** Offers waiting for the creator's answer (newest first). */
  pending: OfferPage;
  /** Everything else, newest first, paged. */
  history: OfferPage;
  reasons: DeclineReason[];
}

/** The creator's own offers (the API scopes them to the session creator) and the API's list of decline reasons. */
export function loadCreatorInbox(input: { cursor?: string }): Promise<CreatorInbox> {
  const cursor = cursorOf(input.cursor);
  return guarded(CREATOR_REQUESTS_PATH, async () => {
    const [pending, history, reasons] = await Promise.all([
      page(ENDPOINTS.creatorOffers, { status: "pending", limit: PENDING_LIMIT, sort: "created_at", dir: "desc" }),
      page(ENDPOINTS.creatorOffers, { limit: PAGE_SIZE, sort: "created_at", dir: "desc", ...(cursor ? { cursor } : {}) }),
      callWithSession(ENDPOINTS.declineReasons).then((r) => r.data),
    ]);
    return { pending, history: { ...history, items: history.items.filter((offer) => offer.status !== "pending") }, reasons };
  });
}

export interface BrandOffers extends OfferPage {
  status: OfferStatus | null;
}

/** The offers on the brand's side: the hires it sent and the applications to its campaigns, with an optional status filter from the URL. */
export function loadBrandOffers(input: { status?: string; cursor?: string }): Promise<BrandOffers> {
  const status = OFFER_STATUS.is(input.status) ? input.status : null;
  const cursor = cursorOf(input.cursor);
  return guarded(BRAND_OFFERS_PATH, async () => ({
    ...(await page(ENDPOINTS.brandOffers, { limit: PAGE_SIZE, sort: "created_at", dir: "desc", ...(status ? { status } : {}), ...(cursor ? { cursor } : {}) })),
    status,
  }));
}

/**
 * The creator a brand is about to hire (platforms with their rates, accepted payment methods, minimum booking), read with the brand's session.
 * An unknown, unavailable or malformed username all end in the same "not found" page; a username of the wrong shape is never sent.
 */
export async function loadHireCreator(username: string, returnTo: string): Promise<HireCreator> {
  if (!isUsername(username)) notFound();
  return guarded(returnTo, async () => {
    try {
      return (await callWithSession(ENDPOINTS.hireCreator, undefined, { username })).data.creator;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || (error.status === 422 && error.code === "validation_failed"))) notFound();
      throw error;
    }
  });
}
