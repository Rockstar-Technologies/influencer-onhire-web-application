import "server-only";
import { callApi } from "@/lib/api/client";
import type { CallResult } from "@/lib/api/client";
import type { Endpoint } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { getForwardedClientIp, readSessionToken } from "./session";

/**
 * Calls an API operation on behalf of the signed-in user: the session comes from this app's cookie and the client address is forwarded under
 * the trusted-proxy rules. With no valid session cookie nothing is sent and a 401 is raised, exactly as the API itself would answer.
 */
export async function callWithSession<TData>(endpoint: Endpoint<TData>, body?: unknown): Promise<CallResult<TData>> {
  const session = await readSessionToken();
  if (!session) throw new ApiError({ status: 401, code: "unauthorized", message: "Authentication is required" });
  return callApi(endpoint, { session, clientIp: await getForwardedClientIp(), ...(body === undefined ? {} : { body }) });
}
