import type { Metadata } from "next";
import { parseIssueQuery } from "@/features/admin/finance-server";
import { ReconciliationPage } from "@/features/admin/finance-pages";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Reconciliation · Admin · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("/admin/reconciliation", "payments.view");
  return <ReconciliationPage query={parseIssueQuery(await searchParams)} />;
}
