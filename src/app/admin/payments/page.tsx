import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PaymentsPage } from "@/features/admin-panel/payments/payments-page";
import { parsePaymentQuery, type RawSearchParams } from "@/features/admin-panel/payments/payment-query";

export const metadata: Metadata = { title: "Payments · Admin · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireAdmin("/admin/payments", "payments.view");
  return <PaymentsPage query={parsePaymentQuery(await searchParams)} />;
}
