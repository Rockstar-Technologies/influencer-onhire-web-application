import type { Metadata } from "next";
import { parseRefundRequestQuery } from "@/features/admin/finance-server";
import { RefundRequestsPage } from "@/features/admin/finance-pages";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Refund requests · Admin · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("/admin/refund-requests", "payments.view");
  return <RefundRequestsPage query={parseRefundRequestQuery(await searchParams)} />;
}
