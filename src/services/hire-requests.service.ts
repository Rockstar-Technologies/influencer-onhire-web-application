import type { CampaignDuration, HireRequest, HireRequestInput } from "@/types/hire-request";
import { MOCK_CAMPAIGN_DURATIONS, MOCK_HIRE_REQUESTS } from "./mock/hire-requests.mock";

// Durations an influencer can be booked for, given their minimum booking ("3 days", "1 week", "1 month").
export async function getCampaignDurations(minimumBooking: string): Promise<CampaignDuration[]> {
  // TODO: replace with `fetch("/api/campaign-durations?min=...")` once the backend exists
  const minimumDays = toDays(minimumBooking);
  return MOCK_CAMPAIGN_DURATIONS.filter((duration) => duration.days >= minimumDays);
}

export async function createHireRequest(input: HireRequestInput): Promise<HireRequest> {
  // TODO: replace with `fetch("/api/hire-requests", { method: "POST", body: JSON.stringify(input) })`
  const id = crypto.randomUUID();
  const request: HireRequest = {
    ...input,
    id,
    reference: `HR-${id.slice(0, 6).toUpperCase()}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  MOCK_HIRE_REQUESTS.push(request);
  return request;
}

const UNIT_DAYS: Record<string, number> = { day: 1, week: 7, month: 30 };

function toDays(text: string) {
  const match = /(\d+)\s*(day|week|month)/i.exec(text);
  return match ? Number(match[1]) * UNIT_DAYS[match[2].toLowerCase()] : 0;
}
