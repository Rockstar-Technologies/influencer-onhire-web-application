"use server";

import { redirect } from "next/navigation";
import { endSession, startSession } from "@/services/session.service";
import { getActiveAccount } from "@/services/user-management.service";

export async function signInAction(formData: FormData) {
  const accountId = formData.get("accountId");
  const account = typeof accountId === "string" ? await getActiveAccount(accountId) : null;
  if (!account) redirect("/sign-in?error=unavailable");

  await startSession(account.id);
  // Follow ?next= only when it stays inside this account's own area, so a crafted link can't send people elsewhere.
  const area = account.type === "brand" ? "/brand" : "/creator";
  const next = formData.get("next");
  redirect(typeof next === "string" && /^\/(brand|creator)\/[a-z-]+$/.test(next) && next.startsWith(`${area}/`) ? next : `${area}/payments`);
}

export async function signOutAction() {
  await endSession();
  redirect("/sign-in");
}
