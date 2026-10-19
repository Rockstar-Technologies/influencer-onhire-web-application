import { FiCheckCircle, FiClock, FiDownloadCloud, FiLock } from "react-icons/fi";
import { EscrowSteps } from "@/components/shared/escrow-steps";
import { StatCardGrid, type StatCard } from "@/components/shared/stat-cards";
import { listBrandPayments, summarizeBrandPayments } from "@/services/payments.service";
import { listActiveAccounts } from "@/services/user-management.service";
import type { ApiUser } from "@/lib/api/schemas";
import { BrandPaymentTable } from "./sections/brand-payment-table";
import { FundCampaignDialog } from "./sections/fund-campaign-dialog";

export async function BrandPaymentsPage({ brand }: { brand: ApiUser }) {
  const [payments, creators] = await Promise.all([listBrandPayments(brand.id), listActiveAccounts("creator")]);
  const summary = summarizeBrandPayments(payments);
  const amount = (value: number) => value.toLocaleString("en-US");
  const count = (status: string) => payments.filter((payment) => payment.status === status).length;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  const cards: StatCard[] = [
    { label: "Total Deposited", value: amount(summary.totalDeposited), unit: "CFA", hint: `Across ${plural(payments.length, "campaign payment", "campaign payments")}`, icon: FiDownloadCloud, tone: "navy" },
    { label: "On Hold", value: amount(summary.onHold), unit: "CFA", hint: `${plural(count("held"), "payment", "payments")} on hold`, icon: FiLock, tone: "navy" },
    { label: "Report Submitted", value: amount(summary.awaitingRelease), unit: "CFA", hint: `${plural(count("requested"), "report", "reports")} waiting for release`, icon: FiClock, tone: "warning" },
    { label: "Released", value: amount(summary.released), unit: "CFA", hint: `${plural(count("released"), "campaign", "campaigns")} completed`, icon: FiCheckCircle, tone: "success" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-heading sm:text-3xl">Payments &amp; Escrow</h1>
          <p className="mt-2 text-sm text-body">Pay creators into escrow and track each payment until the work is delivered.</p>
        </div>
        <FundCampaignDialog creators={creators.map((creator) => ({ id: creator.id, name: creator.name, niche: creator.niche }))} />
      </div>

      <EscrowSteps
        steps={[
          { title: "You pay", body: "Deposit the campaign budget with MTN MoMo or Orange Money." },
          { title: "Held in escrow", body: "Your payment is on hold. The creator sees it on their dashboard and starts the work." },
          { title: "Released on delivery", body: "The creator submits a delivery report. Once it's confirmed, your deposit is released to them." },
        ]}
      />

      <StatCardGrid cards={cards} />

      <section aria-labelledby="brand-payments-heading" className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 id="brand-payments-heading" className="font-display text-base font-bold text-heading">
          Your campaign payments
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted">What you paid and where each payment is in escrow.</p>
        {payments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted">
            No payments yet. Use &ldquo;Pay for a campaign&rdquo; to put your first campaign budget on hold for a creator.
          </p>
        ) : (
          <BrandPaymentTable payments={payments} />
        )}
      </section>
    </div>
  );
}
