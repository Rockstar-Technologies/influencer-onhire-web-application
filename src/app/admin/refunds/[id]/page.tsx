import type { Metadata } from "next";
import { RefundDetailPage } from "@/features/admin/finance-pages";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Refund · Admin · Influencer On Hire" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdmin(`/admin/refunds/${encodeURIComponent(id)}`, "payments.view");
  return <RefundDetailPage id={id} permissions={session.permissions} />;
}
