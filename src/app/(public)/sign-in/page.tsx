import type { Metadata } from "next";
import { SignInPage } from "@/features/public/sign-in/sign-in-page";

export const metadata: Metadata = {
  title: "Log In | Influencer On Hire",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return <SignInPage email={email} />;
}
