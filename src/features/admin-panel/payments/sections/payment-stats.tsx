import { FiArrowDownCircle, FiArrowUpCircle, FiLock, FiTrendingUp } from "react-icons/fi";
import { formatPrice } from "@/lib/utils";
import { getPaymentSummary } from "@/services/payments.service";
import { StatCardGrid, type StatCard } from "../../stat-cards";

export async function PaymentStats() {
  const summary = await getPaymentSummary();
  const amount = (value: number) => value.toLocaleString("en-US");

  const cards: StatCard[] = [
    {
      label: "Gross Deposits",
      value: amount(summary.grossDeposits),
      unit: "CFA",
      hint: `${summary.invoiceCount} invoices · 100% of what brands paid`,
      icon: FiArrowDownCircle,
      tone: "navy",
    },
    {
      label: "Net Payouts",
      value: amount(summary.netPayouts),
      unit: "CFA",
      hint: `Paid to creators on ${summary.releasedCount} released campaigns`,
      icon: FiArrowUpCircle,
      tone: "success",
      href: "/admin/payments?status=released",
    },
    {
      label: "Platform Revenue",
      value: amount(summary.platformRevenue),
      unit: "CFA",
      hint: `20% fee earned · ${formatPrice(summary.pendingRevenue)} pending`,
      icon: FiTrendingUp,
      tone: "success",
    },
    {
      label: "Held in Escrow",
      value: amount(summary.heldInEscrow),
      unit: "CFA",
      hint: `${summary.heldCount} campaigns · ${summary.payoutRequests} payout requests waiting`,
      icon: FiLock,
      tone: "warning",
      href: "/admin/payments?status=requested",
    },
  ];

  return <StatCardGrid cards={cards} />;
}
