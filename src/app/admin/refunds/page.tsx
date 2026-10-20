import type { Metadata } from "next";
import { parseRefundQuery } from "@/features/admin/finance-server";
import { RefundsPage } from "@/features/admin/finance-pages";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Refunds · Admin · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("/admin/refunds", "payments.view");
  return <RefundsPage query={parseRefundQuery(await searchParams)} />;
}
