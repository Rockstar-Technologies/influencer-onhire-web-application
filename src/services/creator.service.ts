import type { CreatorAccount } from "@/types/account";
import type { CampaignRequest, CampaignRequestResponse, CreatorWorkload } from "@/types/campaign-request";
import {
  MOCK_CAMPAIGN_REQUESTS,
  MOCK_CREATOR_WORKLOAD,
  MOCK_CURRENT_CREATOR,
  MOCK_DECLINE_REASONS,
} from "./mock/creator.mock";

export async function getCurrentCreatorAccount(): Promise<CreatorAccount> {
  // TODO: replace with `return fetch("/api/me/creator").then(r => r.json())`
  return MOCK_CURRENT_CREATOR;
}

export async function getCreatorWorkload(): Promise<CreatorWorkload> {
  // TODO: replace with `return fetch("/api/creator/workload").then(r => r.json())`
  return { ...MOCK_CREATOR_WORKLOAD };
}

export async function listCampaignRequests(): Promise<CampaignRequest[]> {
  // TODO: replace with `return fetch("/api/creator/requests").then(r => r.json())`
  return [...MOCK_CAMPAIGN_REQUESTS].sort((a, b) =>
    (b.respondedAt ?? b.receivedAt).localeCompare(a.respondedAt ?? a.receivedAt)
  );
}

export async function listDeclineReasons(): Promise<string[]> {
  // TODO: replace with `return fetch("/api/creator/decline-reasons").then(r => r.json())`
  return MOCK_DECLINE_REASONS;
}

export async function respondToCampaignRequest({
  requestId,
  response,
  declineReason,
}: CampaignRequestResponse): Promise<CampaignRequest> {
  // TODO: replace with `return fetch(`/api/creator/requests/${requestId}/response`, { method: "POST", body: JSON.stringify({ response, declineReason }) }).then(r => r.json())`
  const request = MOCK_CAMPAIGN_REQUESTS.find((item) => item.id === requestId);
  if (!request || request.status !== "pending") throw new Error("Request is no longer pending");

  if (response === "accepted") {
    if (MOCK_CREATOR_WORKLOAD.activeCampaigns >= MOCK_CREATOR_WORKLOAD.maxActiveCampaigns) {
      throw new Error("Creator is at capacity");
    }
    MOCK_CREATOR_WORKLOAD.activeCampaigns += 1;
  }

  request.status = response;
  request.respondedAt = new Date().toISOString().slice(0, 10);
  request.declineReason = response === "declined" ? declineReason : undefined;
  return { ...request };
}
