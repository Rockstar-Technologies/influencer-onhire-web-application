import type {
  Campaign,
  CampaignMatchPreview,
  CampaignMatchSummary,
  CampaignOverview,
  CampaignPreview,
  EngagementRateOption,
  MatchableInfluencer,
  MatchFilterOptions,
  NewCampaignInput,
} from "@/types/campaign";
import {
  MOCK_CAMPAIGN_OVERVIEW,
  MOCK_CAMPAIGN_PREVIEW,
  MOCK_CAMPAIGNS,
  MOCK_ENGAGEMENT_RATE_OPTIONS,
  MOCK_MATCHABLE_INFLUENCERS,
} from "./mock/campaigns.mock";

export async function getCampaignOverview(): Promise<CampaignOverview> {
  // TODO: replace with `return fetch("/api/campaigns/overview").then(r => r.json())`
  return MOCK_CAMPAIGN_OVERVIEW;
}

export async function getCampaignPreview(): Promise<CampaignPreview> {
  // TODO: replace with `return fetch("/api/campaigns/preview").then(r => r.json())`
  return MOCK_CAMPAIGN_PREVIEW;
}

export async function listEngagementRateOptions(): Promise<EngagementRateOption[]> {
  // TODO: replace with `return fetch("/api/campaigns/engagement-rates").then(r => r.json())`
  return MOCK_ENGAGEMENT_RATE_OPTIONS;
}

export async function listMatchFilterOptions(): Promise<MatchFilterOptions> {
  // TODO: replace with `return fetch("/api/campaigns/match-filters").then(r => r.json())`
  const unique = (values: string[]) => Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  return {
    niches: unique(MOCK_MATCHABLE_INFLUENCERS.map((inf) => inf.niche)),
    cities: unique(MOCK_MATCHABLE_INFLUENCERS.map((inf) => inf.city)),
  };
}

function splitList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// The first interest that is a known creator niche becomes the campaign niche;
// the rest (e.g. "Skincare") stay as audience interests only.
function resolveNiches(input: NewCampaignInput) {
  const known = new Set(MOCK_MATCHABLE_INFLUENCERS.map((inf) => inf.niche));
  const niche = splitList(input.interests)
    .map((item) => Array.from(known).find((name) => name.toLowerCase() === item.toLowerCase()))
    .find(Boolean);
  return niche ? [niche] : [];
}

// Mirrors the "Smart Matching" rules: niche, location, engagement, and only
// verified creators who are active and free of conflicting deals.
function findMatches(input: NewCampaignInput, niches: string[], locations: string[]): MatchableInfluencer[] {
  const cities = locations.map((item) => item.toLowerCase());
  const minRate = input.minEngagementRate ?? 0;

  return MOCK_MATCHABLE_INFLUENCERS.filter(
    (inf) =>
      inf.verified &&
      inf.active &&
      !inf.hasConflictingDeal &&
      inf.engagementRate >= minRate &&
      (niches.length === 0 || niches.includes(inf.niche)) &&
      (cities.length === 0 || cities.includes(inf.city.toLowerCase()))
  );
}

function matchInfluencers(input: NewCampaignInput): CampaignMatchSummary {
  const niches = resolveNiches(input);
  const locations = splitList(input.location);
  const matchedCount = findMatches(input, niches, locations).length;
  return { matchedCount, niches, locations, minEngagementRate: input.minEngagementRate };
}

const MIN_MATCHES_PER_LOCATION = 5;
const STRONG_MATCH_ENGAGEMENT = 7.5;

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export async function previewCampaignMatches(input: NewCampaignInput): Promise<CampaignMatchPreview> {
  // TODO: replace with `return fetch("/api/campaigns/match-preview", { method: "POST", body: JSON.stringify(input) }).then(r => r.json())`
  const summary = matchInfluencers(input);
  const matches = findMatches(input, summary.niches, summary.locations);

  const topMatches = [...matches]
    .sort((a, b) => b.engagementRate - a.engagementRate)
    .slice(0, 3)
    .map((inf) => ({
      id: inf.id,
      name: inf.name,
      initials: initialsOf(inf.name),
      niche: inf.niche,
      city: inf.city,
      engagementRate: inf.engagementRate,
      strength: inf.engagementRate >= STRONG_MATCH_ENGAGEMENT ? ("strong" as const) : ("good" as const),
    }));

  const [primaryLocation, ...addedLocations] = summary.locations;
  const primaryOnly = primaryLocation ? findMatches(input, summary.niches, [primaryLocation]).length : 0;
  const broadened =
    addedLocations.length > 0 && primaryOnly < MIN_MATCHES_PER_LOCATION ? { primaryLocation, addedLocations } : undefined;

  return { summary, topMatches, broadened };
}

export async function listMyCampaigns(): Promise<Campaign[]> {
  // TODO: replace with `return fetch("/api/brand/campaigns").then(r => r.json())`
  return MOCK_CAMPAIGNS;
}
