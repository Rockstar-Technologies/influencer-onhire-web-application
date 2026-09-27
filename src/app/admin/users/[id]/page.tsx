import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UserProfilePage } from "@/features/admin-panel/users/profile/user-profile-page";
import { getUserProfile } from "@/services/user-management.service";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const profile = await getUserProfile((await params).id);
  return { title: `${profile?.user.name ?? "User"} · Admin · Influencer On Hire` };
}

export default async function Page({ params }: { params: Params }) {
  const profile = await getUserProfile((await params).id);
  if (!profile) notFound();
  return <UserProfilePage profile={profile} />;
}
