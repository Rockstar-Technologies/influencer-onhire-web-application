import type { Metadata } from "next";
import { CreatorSubmittedPage } from "@/features/public/creator-apply/creator-submitted-page";

export const metadata: Metadata = {
  title: "Profile Submitted | Influencer On Hire",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return <CreatorSubmittedPage applicationId={id} />;
}
