import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { REQUEST_PATH_HEADER } from "@/lib/auth/request-path";

/**
 * Not an authorization layer. It only records the requested path in a request header, so that a page or layout that sends an
 * anonymous visitor to sign-in can say where to come back to (layouts cannot read the URL themselves). The header is ALWAYS overwritten
 * here, so a client-supplied value never reaches the application; the value is still treated as untrusted and re-validated by
 * sanitizeNext before it is used. Access control happens in the pages, actions and route handlers, and in the API.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(REQUEST_PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Everything except static assets and image optimisation.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"],
};
