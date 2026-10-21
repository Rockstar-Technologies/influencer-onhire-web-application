import "server-only";
import { redirect } from "next/navigation";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { CreatorPayment, CreatorWallet, RefundRequest, Withdrawal } from "@/lib/api/schemas";
import { callWithSession } from "@/lib/auth/api-session";
import { signInUrl } from "@/lib/auth/paths";

export const CREATOR_PAYMENTS_PATH = "/creator/payments";
const LIMIT = 50;

async function guarded<T>(returnTo: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(signInUrl({ next: returnTo, expired: true }));
    throw error;
  }
}

export interface CreatorPaymentsData {
  payments: CreatorPayment[];
  paymentsNext: string | null;
  wallet: CreatorWallet;
  withdrawals: Withdrawal[];
}

/** Everything on the creator's payments page, as the API holds it. The API only ever returns this creator's own rows. */
export function loadCreatorPayments(returnTo: string = CREATOR_PAYMENTS_PATH): Promise<CreatorPaymentsData> {
  return guarded(returnTo, async () => {
    const [payments, wallet, withdrawals] = await Promise.all([
      callWithSession(ENDPOINTS.creatorPayments, undefined, { query: { limit: LIMIT } }),
      callWithSession(ENDPOINTS.creatorWallet),
      callWithSession(ENDPOINTS.creatorWithdrawals, undefined, { query: { limit: LIMIT } }),
    ]);
    const next = payments.meta?.nextCursor;
    return { payments: payments.data, paymentsNext: typeof next === "string" ? next : null, wallet: wallet.data.wallet, withdrawals: withdrawals.data };
  });
}

export function loadBrandRefundRequests(returnTo: string): Promise<RefundRequest[]> {
  return guarded(returnTo, async () => (await callWithSession(ENDPOINTS.brandRefundRequests, undefined, { query: { limit: LIMIT } })).data);
}
