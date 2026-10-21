import { getApiConfig } from "@/lib/api/config";

export const dynamic = "force-dynamic";

/**
 * Probe for the hosting platform. It answers 200 only when this server's required configuration is valid (API address, public origin, proxy hops):
 * without it every page fails with a 500, so a probe that only checked "the process is up" would hide a broken deployment. It does not call the API
 * and reveals nothing about the configuration: no values, no error text.
 */
export function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    getApiConfig();
    return Response.json({ status: "ok" }, { headers });
  } catch {
    return Response.json({ status: "misconfigured" }, { status: 503, headers });
  }
}
