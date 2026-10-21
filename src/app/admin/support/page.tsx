import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { SupportPage } from "@/features/admin-panel/support/support-page";

export const metadata: Metadata = { title: "Support & Communication · Admin · Influencer On Hire" };

export default async function Page() {
  await requireAdmin("/admin/support", "tickets.manage");
  return <SupportPage />;
}
