import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AccountType, PlatformUser } from "@/types/user-management";
import { getActiveAccount } from "./user-management.service";

// Demo stand-in for real authentication: the cookie holds only an account id, which anyone could
// set by hand. TODO: replace with a signed, server-verified session once accounts and passwords exist.
const SESSION_COOKIE = "ioh_demo_account";

export async function getSignedInAccount(): Promise<PlatformUser | null> {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  return id ? getActiveAccount(id) : null;
}

// Call at the top of every account page and every account server action; layouts alone
// don't re-run on client-side navigation, so they can't be the only check.
export async function requireAccount(type: AccountType): Promise<PlatformUser> {
  // Influencer accounts live under /creator in URLs.
  const area = type === "brand" ? "brand" : "creator";
  const account = await getSignedInAccount();
  if (!account) redirect(`/sign-in?next=/${area}/payments`);
  if (account.type !== type) redirect(`/sign-in?denied=${area}`);
  return account;
}

// Must be called from a Server Action; cookies can't be written while a page is rendering.
export async function startSession(accountId: string) {
  (await cookies()).set(SESSION_COOKIE, accountId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
