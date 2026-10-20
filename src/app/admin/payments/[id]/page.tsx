import type { Metadata } from "next";
import { PaymentDetailPage } from "@/features/admin/payment-detail-page";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Payment · Admin · Influencer On Hire" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdmin(`/admin/payments/${encodeURIComponent(id)}`, "payments.view");
  return <PaymentDetailPage id={id} viewer={{ permissions: session.permissions, userId: session.user.id }} />;
}
