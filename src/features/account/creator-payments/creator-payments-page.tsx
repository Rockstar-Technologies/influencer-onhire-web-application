import { FiCheckCircle, FiClock, FiLock, FiTrendingUp } from "react-icons/fi";
import { EscrowSteps } from "@/components/shared/escrow-steps";
import { StatCardGrid, type StatCard } from "@/components/shared/stat-cards";
import { listCreatorPayments, summarizeCreatorPayments } from "@/services/payments.service";
import type { PlatformUser } from "@/types/user-management";
import { CreatorPaymentTable } from "./sections/creator-payment-table";

export async function CreatorPaymentsPage({ creator }: { creator: PlatformUser }) {
  const payments = await listCreatorPayments(creator.id);
  const summary = summarizeCreatorPayments(payments);
  const amount = (value: number) => value.toLocaleString("en-US");
  const count = (status: string) => payments.filter((payment) => payment.status === status).length;
  const onHold = count("held");

  const cards: StatCard[] = [
    { label: "On Hold for You", value: amount(summary.onHold), unit: "CFA", hint: `${onHold} ${onHold === 1 ? "campaign" : "campaigns"} ready to deliver`, icon: FiLock, tone: "navy" },
    { label: "Awaiting Release", value: amount(summary.awaitingRelease), unit: "CFA", hint: `${count("requested")} cashout ${count("requested") === 1 ? "request" : "requests"} in review`, icon: FiClock, tone: "warning" },
    { label: "Released to Balance", value: amount(summary.released), unit: "CFA", hint: "Ready to withdraw to mobile money", icon: FiCheckCircle, tone: "success" },
    { label: "Total Earnings", value: amount(summary.totalEarnings), unit: "CFA", hint: "Take-home pay, after fees", icon: FiTrendingUp, tone: "success" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-heading sm:text-3xl">Earnings &amp; Payouts</h1>
        <p className="mt-2 text-sm text-body">Every amount here is your take-home pay, after the 20% platform service fee.</p>
      </div>

      {onHold > 0 && (
        <p className="flex items-center gap-2 rounded-xl border border-info/20 bg-info-light px-4 py-3 text-sm text-navy">
          <FiLock className="shrink-0" aria-hidden />
          {onHold === 1 ? "A brand has paid for a campaign." : `${onHold} brands have paid for campaigns.`} The money is on hold for you. Deliver the work, then submit
          your report to cash out.
        </p>
      )}

      <EscrowSteps
        steps={[
          { title: "Brand pays", body: "The brand pays the campaign budget into escrow with MTN MoMo or Orange Money." },
          { title: "On hold for you", body: "Your take-home pay is locked while you create and post the content." },
          { title: "Report & cash out", body: "Submit a delivery report with links to your posts and choose where to receive your money." },
        ]}
      />

      <StatCardGrid cards={cards} />

      <section aria-labelledby="creator-payments-heading" className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 id="creator-payments-heading" className="font-display text-base font-bold text-heading">
          Your campaigns
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted">Open a row to see how your pay is worked out.</p>
        {payments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted">
            No payments yet. When a brand hires you and pays, the money shows here on hold for you.
          </p>
        ) : (
          <CreatorPaymentTable payments={payments} />
        )}
      </section>
    </div>
  );
}
