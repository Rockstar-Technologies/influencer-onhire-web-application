import type { Metadata } from "next";
import { HirePage } from "@/features/public/hire/hire-page";
import { getInfluencerProfile } from "@/services/influencers.service";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await getInfluencerProfile(username);
  return { title: profile ? `Hire ${profile.name} · Influencer On Hire` : "Influencer not found · Influencer On Hire" };
}

export default async function Page({ params }: Props) {
  const { username } = await params;
  return <HirePage username={username} />;
}
