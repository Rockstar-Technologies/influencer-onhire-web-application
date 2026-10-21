import type { Metadata } from "next";
import { requireBrand } from "@/lib/auth/session";
import { HirePage } from "@/features/offers/hire/hire-page";

type Props = { params: Promise<{ username: string }> };

export const metadata: Metadata = { title: "Hire an influencer · Influencer On Hire" };

export default async function Page({ params }: Props) {
  const { username } = await params;
  await requireBrand(`/influencers/${encodeURIComponent(username)}/hire`);
  return <HirePage username={username} />;
}
