/** What the auth Server Actions return to the browser. No tokens, cookies or upstream bodies ever appear here. */
export type AuthFailure =
  | { kind: "invalid_credentials" }
  | { kind: "email_taken" }
  | { kind: "account_blocked"; message: string }
  | { kind: "validation"; fieldErrors: Partial<Record<"fullName" | "email" | "phone" | "password" | "terms", string>> }
  | { kind: "rate_limited"; retryAfterSeconds: number | null }
  | { kind: "unavailable"; requestId: string | null };

export type AuthActionResult = { ok: true; redirectTo: string } | { ok: false; error: AuthFailure };
