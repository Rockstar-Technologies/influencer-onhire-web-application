import type { Metadata } from "next";
import { RefundRequestDetailPage } from "@/features/admin/finance-pages";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Refund request · Admin · Influencer On Hire" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdmin(`/admin/refund-requests/${encodeURIComponent(id)}`, "payments.view");
  return <RefundRequestDetailPage id={id} permissions={session.permissions} />;
}
