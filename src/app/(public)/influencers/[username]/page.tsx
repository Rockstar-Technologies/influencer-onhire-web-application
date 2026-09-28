import type { Metadata } from "next";
import { InfluencerProfilePage } from "@/features/public/influencer-profile/influencer-profile-page";
import { getInfluencerProfile } from "@/services/influencers.service";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await getInfluencerProfile(username);
  return { title: profile ? `${profile.name} · Influencer On Hire` : "Influencer not found · Influencer On Hire" };
}

export default async function Page({ params }: Props) {
  const { username } = await params;
  return <InfluencerProfilePage username={username} />;
}
