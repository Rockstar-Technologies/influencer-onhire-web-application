import type { Metadata } from "next";
import { ForBrandsPage } from "@/features/public/for-brands/for-brands-page";

export const metadata: Metadata = {
  title: "For Brands | Influencer On Hire",
};

export default function Page() {
  return <ForBrandsPage />;
}
