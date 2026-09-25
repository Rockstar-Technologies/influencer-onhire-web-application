"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { signIn } from "@/services/auth.service";
import { InvalidCredentialsError } from "@/types/auth";
import type { AccountType } from "@/types/auth";

// Each account type lands on its own dashboard after signing in.
const HOME: Record<AccountType, string> = {
  brand: "/brand/payments",
  creator: "/creator/requests",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const control = (hasError?: boolean) =>
  cn(
    "h-11 w-full rounded-lg border bg-surface px-3 text-sm text-heading outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15",
    hasError ? "border-danger" : "border-border"
  );

export function SignInForm({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const errors = attempted
    ? {
        email: EMAIL_PATTERN.test(email.trim()) ? undefined : "Enter the email you signed up with.",
        password: password ? undefined : "Enter your password.",
      }
    : {};

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    setServerError(null);
    if (!EMAIL_PATTERN.test(email.trim()) || !password) return;

    setSubmitting(true);
    try {
      const account = await signIn({ email, password, remember });
      router.push(HOME[account.accountType]);
    } catch (error) {
      setServerError(
        error instanceof InvalidCredentialsError
          ? "Email or password is incorrect. Check them and try again."
          : "We couldn't sign you in. Check your connection and try again."
      );
      setSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-heading">Login to your account</h2>
        <p className="mt-1 text-sm text-body">Brands and creators use the same login.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signin-email" className="text-sm font-semibold text-heading">
          Email
        </label>
        <input
          id="signin-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "signin-email-error" : undefined}
          className={control(Boolean(errors.email))}
        />
        {errors.email && (
          <p id="signin-email-error" className="text-xs font-medium text-danger">
            {errors.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="signin-password" className="text-sm font-semibold text-heading">
            Password
          </label>
          <Link href="/coming-soon?title=Reset+Password" className="text-xs font-semibold text-primary hover:text-primary-hover">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            id="signin-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "signin-password-error" : undefined}
            className={cn(control(Boolean(errors.password)), "pr-16")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-pressed={showPassword}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary-light"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {errors.password && (
          <p id="signin-password-error" className="text-xs font-medium text-danger">
            {errors.password}
          </p>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-body">
        <input
          id="signin-remember"
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          className="h-4 w-4 accent-[var(--color-primary)]"
        />
        Keep me logged in on this device
      </label>

      {serverError && (
        <p className="rounded-lg bg-danger/10 px-3 py-2.5 text-sm text-danger" role="alert">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="h-11 w-full rounded-full bg-primary text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Logging in…" : "Login"}
      </button>

      <p className="text-center text-sm text-body">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-semibold text-primary hover:text-primary-hover">
          Sign up free
        </Link>
      </p>
    </form>
  );
}
