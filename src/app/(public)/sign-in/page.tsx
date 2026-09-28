import type { Metadata } from "next";
import { SignInPage } from "@/features/account/sign-in/sign-in-page";
import { listActiveAccounts } from "@/services/user-management.service";

export const metadata: Metadata = { title: "Sign in · Influencer On Hire" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const [brands, creators] = await Promise.all([listActiveAccounts("brand"), listActiveAccounts("influencer")]);
  return <SignInPage brands={brands} creators={creators} next={first(params.next)} denied={first(params.denied)} error={first(params.error)} />;
}
