import type { Metadata } from "next";
import { OverviewPage } from "@/features/admin/overview-page";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Overview · Admin · Influencer On Hire" };

export default async function Page() {
  const { permissions } = await requireAdmin("/admin");
  return <OverviewPage permissions={permissions} />;
}
