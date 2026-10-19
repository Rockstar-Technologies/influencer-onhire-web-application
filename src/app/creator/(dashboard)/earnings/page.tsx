import type { Metadata } from "next";
import { EarningsPage } from "@/features/creator/earnings/earnings-page";
import { requireCreator } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Earnings & Payouts | Influencer On Hire",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireCreator("/creator/earnings");
  const { q } = await searchParams;
  return <EarningsPage query={q ?? ""} />;
}
