/**
 * CSRF defence for custom state-changing Route Handlers. Next.js checks the `Origin` header for Server Actions, but that protection
 * does not cover Route Handlers, so every handler that changes state must call `verifyRequestOrigin` itself (and still verify the
 * session and the user's permission). Prefer Server Actions over such handlers.
 */
export type OriginVerdict = { ok: true } | { ok: false; reason: "method" | "origin" | "fetch_site" | "content_type" };

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function verifyRequestOrigin(
  request: { method: string; headers: { get(name: string): string | null } },
  allowedOrigins: readonly string[],
  options: { requireJson?: boolean } = {},
): OriginVerdict {
  // Safe methods never change state and are not subject to this check (and must never change state).
  if (SAFE_METHODS.has(request.method.toUpperCase())) return { ok: true };

  const origin = request.headers.get("origin");
  // A missing Origin on a state-changing request is refused: browsers send it on every cross-origin and same-origin POST.
  if (!origin || origin === "null" || !allowedOrigins.includes(origin)) return { ok: false, reason: "origin" };

  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return { ok: false, reason: "fetch_site" };

  if (options.requireJson) {
    const type = (request.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase();
    if (type !== "application/json") return { ok: false, reason: "content_type" };
  }
  return { ok: true };
}
