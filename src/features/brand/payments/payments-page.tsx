import {
  getEscrowSummary,
  listCampaignPayments,
  listEscrowSteps,
  listHireableInfluencers,
} from "@/services/campaign-payments.service";
import { EscrowSteps } from "@/components/shared/campaign-escrow-steps";
import { PaymentsDashboard } from "./sections/payments-dashboard";

export async function PaymentsPage({ query }: { query: string }) {
  const [steps, payments, summary, influencers] = await Promise.all([
    listEscrowSteps(),
    listCampaignPayments(),
    getEscrowSummary(),
    listHireableInfluencers(),
  ]);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <PaymentsDashboard
        query={query}
        initialPayments={payments}
        initialSummary={summary}
        influencers={influencers}
        steps={<EscrowSteps steps={steps} />}
      />
    </div>
  );
}
