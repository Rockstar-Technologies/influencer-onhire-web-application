import type { Metadata } from "next";
import { parseWithdrawalQuery } from "@/features/admin/finance-server";
import { WithdrawalsPage } from "@/features/admin/finance-pages";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Withdrawals · Admin · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("/admin/withdrawals", "payments.view");
  return <WithdrawalsPage query={parseWithdrawalQuery(await searchParams)} />;
}
