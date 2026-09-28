import type { Metadata } from "next";
import { EarningsPage } from "@/features/creator/earnings/earnings-page";

export const metadata: Metadata = {
  title: "Earnings & Payouts | Influencer On Hire",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return <EarningsPage query={q ?? ""} />;
}
