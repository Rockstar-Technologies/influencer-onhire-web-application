import {
  getCreatorWorkload,
  listCampaignRequests,
  listDeclineReasons,
} from "@/services/creator.service";
import { CampaignRequestsBoard } from "./sections/campaign-requests-board";

export async function CampaignRequestsPage({ query }: { query: string }) {
  const [requests, workload, declineReasons] = await Promise.all([
    listCampaignRequests(),
    getCreatorWorkload(),
    listDeclineReasons(),
  ]);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <CampaignRequestsBoard
        query={query}
        initialRequests={requests}
        initialWorkload={workload}
        declineReasons={declineReasons}
      />
    </div>
  );
}
