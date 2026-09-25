import { EscrowSteps } from "@/components/shared/escrow-steps";
import {
  getEarningsSummary,
  getMinimumWithdrawal,
  listCreatorCampaignEarnings,
  listCreatorEscrowSteps,
  listWithdrawals,
} from "@/services/earnings.service";
import { EarningsDashboard } from "./sections/earnings-dashboard";

export async function EarningsPage({ query }: { query: string }) {
  const [steps, summary, earnings, withdrawals, minimumWithdrawal] = await Promise.all([
    listCreatorEscrowSteps(),
    getEarningsSummary(),
    listCreatorCampaignEarnings(),
    listWithdrawals(),
    getMinimumWithdrawal(),
  ]);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <EarningsDashboard
        query={query}
        steps={<EscrowSteps steps={steps} />}
        minimumWithdrawal={minimumWithdrawal}
        initialSummary={summary}
        initialEarnings={earnings}
        initialWithdrawals={withdrawals}
      />
    </div>
  );
}
