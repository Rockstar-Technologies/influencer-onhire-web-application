import type { Metadata } from "next";
import { requireCreator } from "@/lib/auth/session";
import { CreatorApplyPage } from "@/features/public/creator-apply/creator-apply-page";

export const metadata: Metadata = {
  title: "Creator Sign-up: Rates & Payment | Influencer On Hire",
};

export default async function Page() {
  await requireCreator("/for-creators/apply/rates", { allowPending: true });
  return <CreatorApplyPage step="rates" />;
}
