import { decideAccess } from "@/lib/auth/access";
import { getSession } from "@/lib/auth/session";

const NO_STORE = { "Cache-Control": "no-store" } as const;

const json = (status: number, error: string) => new Response(JSON.stringify({ error }), { status, headers: { "Content-Type": "application/json", ...NO_STORE } });

/**
 * The dashboard export. The API has no export source (the dashboard figures and the revenue series do not exist; revenue is blocked by decision D16),
 * and this application no longer invents sample data for it. Administrators holding `dashboard.export` get an honest 501; everyone else keeps the same
 * answers as before (401 without a valid session, 403 without the permission). Read-only: any other method is refused.
 */
export async function GET() {
  const session = await getSession();
  const decision = decideAccess(session, { role: "admin", permission: "dashboard.export" });
  if (!decision.allowed) return json(decision.reason === "anonymous" ? 401 : 403, decision.reason === "anonymous" ? "unauthorized" : "forbidden");
  return json(501, "export_not_available");
}

const refuse = () => new Response(null, { status: 405, headers: { Allow: "GET", ...NO_STORE } });
export const POST = refuse;
export const PUT = refuse;
export const PATCH = refuse;
export const DELETE = refuse;
