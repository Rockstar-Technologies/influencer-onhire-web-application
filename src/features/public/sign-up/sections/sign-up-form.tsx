"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatCameroonPhone, isCameroonMobile } from "@/lib/format";
import { signUpAction } from "@/features/auth/actions";
import { authFailureMessage } from "@/features/auth/messages";
import type { SignUpAccountType as AccountType } from "@/features/auth/schemas";

interface Values {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}
type Errors = Partial<Record<keyof Values | "terms", string>>;

const ACCOUNT_TYPES: { id: AccountType; title: string; description: string }[] = [
  { id: "brand", title: "I'm a Brand", description: "Hire creators for my business" },
  { id: "creator", title: "I'm a Creator", description: "Get paid for my content" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-heading">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const control = (hasError?: boolean) =>
  cn(
    "h-11 w-full rounded-lg border bg-surface px-3 text-sm text-heading outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15",
    hasError ? "border-danger" : "border-border"
  );

export function SignUpForm({ minPasswordLength }: { minPasswordLength: number }) {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("brand");
  const [values, setValues] = useState<Values>({ fullName: "", email: "", phone: "", password: "" });
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<ReactNode>(null);

  function validate(): Errors {
    const errors: Errors = {};
    if (values.fullName.trim().length < 2) {
      errors.fullName = accountType === "brand" ? "Enter your business name." : "Enter your full name.";
    }
    if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = "Enter a valid email, e.g. name@example.com.";
    if (!isCameroonMobile(values.phone)) errors.phone = "Use a 9-digit Cameroon number starting with 6.";
    if (values.password.length < minPasswordLength) errors.password = `Use at least ${minPasswordLength} characters.`;
    else if (!/\d/.test(values.password) || !/[a-z]/i.test(values.password)) errors.password = "Mix letters and at least one number.";
    if (!agreed) errors.terms = "Please accept the terms to continue.";
    return errors;
  }

  const errors = attempted ? validate() : {};
  const bind = (key: keyof Values) => ({
    id: `signup-${key}`,
    value: values[key],
    onChange: (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: event.target.value })),
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `signup-${key}-error` : undefined,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    setServerError(null);
    if (Object.keys(validate()).length) return;

    setSubmitting(true);
    try {
      const result = await signUpAction({
        accountType,
        fullName: values.fullName,
        email: values.email,
        phone: formatCameroonPhone(values.phone),
        password: values.password,
        acceptTerms: agreed,
      });
      if (result.ok) {
        router.replace(result.redirectTo);
        router.refresh();
        return;
      }
      if (result.error.kind === "email_taken") {
        setServerError(
          <>
            An account with this email already exists.{" "}
            <Link href={`/sign-in?email=${encodeURIComponent(values.email.trim())}`} className="font-semibold underline">
              Login instead
            </Link>
            .
          </>
        );
      } else {
        setServerError(authFailureMessage(result.error));
      }
    } catch {
      setServerError(authFailureMessage({ kind: "unavailable", requestId: null }));
    }
    setSubmitting(false);
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-heading">I want to join as</legend>
        <div className="grid grid-cols-2 gap-3">
          {ACCOUNT_TYPES.map((type) => (
            <label
              key={type.id}
              className={cn(
                "cursor-pointer rounded-xl border p-3.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30",
                accountType === type.id ? "border-primary bg-primary-light" : "border-border hover:bg-surface-alt"
              )}
            >
              <input
                type="radio"
                name="account-type"
                value={type.id}
                checked={accountType === type.id}
                onChange={() => setAccountType(type.id)}
                className="sr-only"
              />
              <span className={cn("block text-sm font-bold", accountType === type.id ? "text-primary" : "text-heading")}>
                {type.title}
              </span>
              <span className="mt-0.5 block text-xs text-muted">{type.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field id="signup-fullName" label={accountType === "brand" ? "Business name" : "Full name"} error={errors.fullName}>
        <input
          {...bind("fullName")}
          autoComplete={accountType === "brand" ? "organization" : "name"}
          placeholder={accountType === "brand" ? "e.g. Lumière Cosmetics" : "e.g. Amara Kilonzo"}
          className={control(Boolean(errors.fullName))}
        />
      </Field>

      <Field id="signup-email" label="Email" error={errors.email}>
        <input {...bind("email")} type="email" autoComplete="email" placeholder="you@example.com" className={control(Boolean(errors.email))} />
      </Field>

      <Field id="signup-phone" label="Mobile number" error={errors.phone}>
        <div className="flex">
          <span className="flex items-center rounded-l-lg border border-r-0 border-border bg-surface-alt px-3 text-sm font-medium text-body">
            +237
          </span>
          <input
            {...bind("phone")}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="6XX XXX XXX"
            className={cn(control(Boolean(errors.phone)), "rounded-l-none")}
          />
        </div>
      </Field>

      <Field id="signup-password" label="Password" error={errors.password}>
        <div className="relative">
          <input
            {...bind("password")}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder={`At least ${minPasswordLength} characters`}
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
      </Field>

      <div>
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-body">
          <input
            id="signup-terms"
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
          />
          <span>
            I agree to the{" "}
            <Link href="/coming-soon?title=Terms+of+Service" className="font-semibold text-primary hover:text-primary-hover">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/coming-soon?title=Privacy+Policy" className="font-semibold text-primary hover:text-primary-hover">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.terms && <p className="mt-1.5 text-xs font-medium text-danger">{errors.terms}</p>}
      </div>

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
        {submitting ? "Creating your account…" : "Create Account"}
      </button>

      <p className="text-center text-sm text-body">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-primary hover:text-primary-hover">
          Login
        </Link>
      </p>
    </form>
  );
}
