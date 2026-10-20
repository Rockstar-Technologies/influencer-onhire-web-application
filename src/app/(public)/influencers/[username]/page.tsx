import type { Metadata } from "next";
import { InfluencerProfilePage } from "@/features/public/influencer-profile/influencer-profile-page";

type Props = { params: Promise<{ username: string }> };

// The title is generic on purpose: the page itself loads (and honestly 404s) the profile, and a missing creator must not be told apart in metadata.
export const metadata: Metadata = { title: "Influencer profile · Influencer On Hire" };

export default async function Page({ params }: Props) {
  const { username } = await params;
  return <InfluencerProfilePage username={username} />;
}
