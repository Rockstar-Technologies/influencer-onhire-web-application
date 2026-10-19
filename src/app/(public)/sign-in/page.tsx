import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInPage } from "@/features/public/sign-in/sign-in-page";
import { homeFor, sanitizeNext } from "@/lib/auth/paths";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Sign in | Influencer On Hire",
};

type SearchParams = Promise<{ email?: string | string[]; next?: string | string[]; denied?: string | string[]; expired?: string | string[] }>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const session = await getSession();
  const denied = first(params.denied);
  const next = first(params.next);

  // Someone who is already signed in goes straight to where they belong (unless they were just turned away from a page).
  if (session && !denied) redirect(sanitizeNext(next, session.user) ?? homeFor(session.user));

  return (
    <SignInPage
      email={first(params.email)?.slice(0, 254)}
      next={next}
      denied={denied}
      expired={first(params.expired) === "1"}
      session={session}
    />
  );
}
