import type { Metadata } from "next";
import { ForCreatorsPage } from "@/features/public/for-creators/for-creators-page";

export const metadata: Metadata = {
  title: "For Creators | Influencer On Hire",
};

export default function Page() {
  return <ForCreatorsPage />;
}
