import type { Metadata } from "next";
import { IssueDetailPage } from "@/features/admin/finance-pages";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Issue · Admin · Influencer On Hire" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdmin(`/admin/reconciliation/${encodeURIComponent(id)}`, "payments.view");
  return <IssueDetailPage id={id} permissions={session.permissions} />;
}
