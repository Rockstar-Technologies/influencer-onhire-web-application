import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { SupportPage } from "@/features/admin-panel/support/support-page";
import { parseTicketQuery, type RawSearchParams } from "@/features/admin-panel/support/ticket-query";

export const metadata: Metadata = { title: "Support & Communication · Admin · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireAdmin("/admin/support", "tickets.manage");
  return <SupportPage query={parseTicketQuery(await searchParams)} />;
}
