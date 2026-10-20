import type { Metadata } from "next";
import { WithdrawalDetailPage } from "@/features/admin/finance-pages";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Withdrawal · Admin · Influencer On Hire" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdmin(`/admin/withdrawals/${encodeURIComponent(id)}`, "payments.view");
  return <WithdrawalDetailPage id={id} permissions={session.permissions} />;
}
