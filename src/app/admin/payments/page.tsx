import type { Metadata } from "next";
import { PaymentsAdminPage } from "@/features/admin/payments-page";
import { parsePaymentQuery } from "@/features/admin/server";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Payments · Admin · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("/admin/payments", "payments.view");
  return <PaymentsAdminPage query={parsePaymentQuery(await searchParams)} />;
}
