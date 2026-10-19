import type { Metadata } from "next";
import { requireCreator } from "@/lib/auth/session";
import { CreatorSubmittedPage } from "@/features/public/creator-apply/creator-submitted-page";

export const metadata: Metadata = {
  title: "Profile Submitted | Influencer On Hire",
};

export default async function Page() {
  // The application shown is always the signed-in creator's own (the API derives it from the session); no id is read from the URL.
  await requireCreator("/for-creators/apply/submitted", { allowPending: true });
  return <CreatorSubmittedPage />;
}
