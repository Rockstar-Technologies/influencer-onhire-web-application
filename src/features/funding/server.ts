import "server-only";
import { notFound, redirect } from "next/navigation";
import { ENDPOINTS, isUuid } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { BrandPayment, FundingView, OfferView } from "@/lib/api/schemas";
import { callWithSession } from "@/lib/auth/api-session";
import { signInUrl } from "@/lib/auth/paths";

export const PAYMENTS_PATH = "/brand/payments";
export const PAGE_SIZE = 20;
export const fundPath = (offerId: string) => `/brand/offers/${offerId}/fund`;

async function guarded<T>(returnTo: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(signInUrl({ next: returnTo, expired: true }));
    throw error;
  }
}

/** One of the brand's own accepted offers with its funding state. A malformed id, a missing offer and another brand's offer all end in the same "not found". */
export async function loadFundable(offerId: string): Promise<{ offer: OfferView; funding: FundingView }> {
  if (!isUuid(offerId)) notFound();
  return guarded(fundPath(offerId), async () => {
    try {
      const [offer, funding] = await Promise.all([
        callWithSession(ENDPOINTS.brandOffer, undefined, { id: offerId }).then((r) => r.data.offer),
        callWithSession(ENDPOINTS.brandFunding, undefined, { id: offerId }).then((r) => r.data.funding),
      ]);
      return { offer, funding };
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || (error.status === 422 && error.code === "validation_failed"))) notFound();
      throw error;
    }
  });
}

/** Funding state of several accepted offers, for the badges on the hires list. A state that can't be read is simply left out (no badge), never guessed. */
export async function loadFundingStates(offerIds: readonly string[]): Promise<Map<string, FundingView>> {
  const results = await Promise.allSettled(offerIds.filter(isUuid).map((id) => callWithSession(ENDPOINTS.brandFunding, undefined, { id }).then((r) => r.data.funding)));
  const states = new Map<string, FundingView>();
  for (const result of results) if (result.status === "fulfilled") states.set(result.value.offerId, result.value);
  return states;
}

export interface PaymentPage {
  items: BrandPayment[];
  nextCursor: string | null;
}

export function loadBrandPayments(input: { cursor?: string }): Promise<PaymentPage> {
  const cursor = typeof input.cursor === "string" && /^[A-Za-z0-9_=-]{1,512}$/.test(input.cursor) ? input.cursor : undefined;
  return guarded(PAYMENTS_PATH, async () => {
    const result = await callWithSession(ENDPOINTS.brandPayments, undefined, { query: { limit: PAGE_SIZE, ...(cursor ? { cursor } : {}) } });
    const next = result.meta?.nextCursor;
    return { items: result.data, nextCursor: typeof next === "string" ? next : null };
  });
}
