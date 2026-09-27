import type { CampaignDuration, HireRequest } from "@/types/hire-request";

export const MOCK_CAMPAIGN_DURATIONS: CampaignDuration[] = [
  { value: "1-week", label: "1 week", days: 7 },
  { value: "2-weeks", label: "2 weeks", days: 14 },
  { value: "1-month", label: "1 month", days: 30 },
  { value: "2-months", label: "2 months", days: 60 },
  { value: "3-months-plus", label: "3+ months", days: 90 },
];

// In-memory stand-in for the hire_requests table. Resets whenever the dev server restarts.
export const MOCK_HIRE_REQUESTS: HireRequest[] = [];
