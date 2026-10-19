"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { callApi } from "@/lib/api/client";
import { getApiConfig } from "@/lib/api/config";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { ApiConfigError, ApiError, UpstreamContractError, UpstreamUnavailableError } from "@/lib/api/errors";
import type { ApiUser } from "@/lib/api/schemas";
import { BROWSER_SESSION_COOKIE, browserCookieOptions } from "@/lib/api/session-cookie";
import type { CallResult } from "@/lib/api/client";
import { afterSignUpFor, homeFor, sanitizeNext, signInUrl } from "@/lib/auth/paths";
import { getForwardedClientIp, readSessionToken } from "@/lib/auth/session";
import { signInInputSchema, signUpInputSchema } from "./schemas";
import type { AuthActionResult, AuthFailure } from "./result";

const FIELD_FOR_PATH: Record<string, "fullName" | "email" | "phone" | "password" | "terms"> = {
  "body.fullName": "fullName",
  "body.email": "email",
  "body.phone": "phone",
  "body.password": "password",
  "body.acceptTerms": "terms",
};

function failureFrom(error: unknown): AuthFailure {
  if (error instanceof ApiError) {
    if (error.status === 401 && error.code === "invalid_credentials") return { kind: "invalid_credentials" };
    if (error.status === 409 && error.code === "email_already_registered") return { kind: "email_taken" };
    if (error.status === 403 && (error.code === "account_suspended" || error.code === "account_rejected")) {
      return { kind: "account_blocked", message: error.message };
    }
    if (error.status === 422) {
      const fieldErrors: Extract<AuthFailure, { kind: "validation" }>["fieldErrors"] = {};
      for (const detail of error.details) {
        const field = FIELD_FOR_PATH[detail.path];
        if (field && !fieldErrors[field]) fieldErrors[field] = detail.message;
      }
      return { kind: "validation", fieldErrors };
    }
    if (error.status === 429) return { kind: "rate_limited", retryAfterSeconds: error.retryAfterSeconds };
    return { kind: "unavailable", requestId: error.requestId };
  }
  if (!(error instanceof UpstreamUnavailableError) && !(error instanceof UpstreamContractError)) {
    // A configuration or programming error: report it and fail closed. Only the error name and, for configuration errors (fixed
    // strings that never contain values), the message are logged; never request data, cookies or upstream bodies.
    console.error("[auth] unexpected error", error instanceof Error ? error.name : "unknown", error instanceof ApiConfigError ? error.message : "");
  }
  return { kind: "unavailable", requestId: null };
}

/** Copies the API's session cookie onto THIS application's cookie (HttpOnly, Secure in production, SameSite=Lax, host-only). */
async function storeSession(result: CallResult<{ user: ApiUser }>): Promise<boolean> {
  const upstream = result.sessionCookie;
  if (!upstream || upstream.value === null) return false;
  (await cookies()).set(BROWSER_SESSION_COOKIE, upstream.value, browserCookieOptions(getApiConfig().isProduction, upstream.maxAgeSeconds));
  return true;
}

export async function signInAction(input: unknown, next?: string): Promise<AuthActionResult> {
  const parsed = signInInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: { kind: "invalid_credentials" } };
  try {
    const result = await callApi(
      ENDPOINTS.login,
      { body: { email: parsed.data.email, password: parsed.data.password, remember: parsed.data.remember }, clientIp: await getForwardedClientIp() },
    );
    if (!(await storeSession(result))) return { ok: false, error: { kind: "unavailable", requestId: result.requestId } };
    return { ok: true, redirectTo: sanitizeNext(next, result.data.user) ?? homeFor(result.data.user) };
  } catch (error) {
    return { ok: false, error: failureFrom(error) };
  }
}

export async function signUpAction(input: unknown): Promise<AuthActionResult> {
  const parsed = signUpInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Extract<AuthFailure, { kind: "validation" }>["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      const field = key === "acceptTerms" ? "terms" : key;
      if ((field === "fullName" || field === "email" || field === "phone" || field === "password" || field === "terms") && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { ok: false, error: { kind: "validation", fieldErrors } };
  }
  try {
    const result = await callApi(ENDPOINTS.register, { body: parsed.data, clientIp: await getForwardedClientIp() });
    if (!(await storeSession(result))) return { ok: false, error: { kind: "unavailable", requestId: result.requestId } };
    return { ok: true, redirectTo: afterSignUpFor(result.data.user) };
  } catch (error) {
    return { ok: false, error: failureFrom(error) };
  }
}

/** Revokes the session at the API (best effort) and always removes the cookie, so the browser is signed out even if the API is down. */
export async function signOutAction(): Promise<void> {
  const token = await readSessionToken();
  if (token) {
    try {
      await callApi(ENDPOINTS.logout, { session: token, clientIp: await getForwardedClientIp() });
    } catch {
      // The cookie is removed below regardless; an unreachable API cannot keep this browser signed in.
    }
  }
  (await cookies()).delete(BROWSER_SESSION_COOKIE);
  redirect(signInUrl());
}
