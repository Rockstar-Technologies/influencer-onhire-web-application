import type { Metadata } from "next";
import { CreatorApplyPage } from "@/features/public/creator-apply/creator-apply-page";

export const metadata: Metadata = {
  title: "Creator Sign-up: Audience & Work | Influencer On Hire",
};

export default function Page() {
  return <CreatorApplyPage step="audience" />;
}
