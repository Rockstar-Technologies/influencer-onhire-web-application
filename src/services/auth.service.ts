import { EmailTakenError, InvalidCredentialsError } from "@/types/auth";
import type { SignInInput, SignUpInput, UserAccount } from "@/types/auth";
import { MIN_PASSWORD_LENGTH, MOCK_ACCOUNTS, MOCK_CREDENTIALS } from "./mock/auth.mock";

export async function getPasswordRules(): Promise<{ minLength: number }> {
  // TODO: replace with `return fetch("/api/auth/password-rules").then(r => r.json())`
  return { minLength: MIN_PASSWORD_LENGTH };
}

export async function signUp(input: SignUpInput): Promise<UserAccount> {
  // TODO: replace with `return fetch("/api/auth/sign-up", { method: "POST", body: JSON.stringify(input) })`
  // and map a 409 response to EmailTakenError.
  const email = input.email.trim().toLowerCase();
  if (MOCK_ACCOUNTS.some((account) => account.email === email)) throw new EmailTakenError();

  const account: UserAccount = {
    id: `usr-${Date.now().toString(36)}`,
    accountType: input.accountType,
    fullName: input.fullName.trim(),
    email,
    phone: input.phone,
    createdAt: new Date().toISOString(),
  };
  MOCK_ACCOUNTS.push(account);
  MOCK_CREDENTIALS[email] = input.password;
  return account;
}

export async function signIn(input: SignInInput): Promise<UserAccount> {
  // TODO: replace with `return fetch("/api/auth/sign-in", { method: "POST", body: JSON.stringify(input) })`
  // and map a 401 response to InvalidCredentialsError. `remember` controls the session cookie's lifetime.
  const email = input.email.trim().toLowerCase();
  const account = MOCK_ACCOUNTS.find((item) => item.email === email);
  if (!account || MOCK_CREDENTIALS[email] !== input.password) throw new InvalidCredentialsError();
  return account;
}
