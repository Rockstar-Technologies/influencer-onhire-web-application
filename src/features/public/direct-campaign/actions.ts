"use server";

import { createCampaign, estimateCampaignReach, getCampaignFormOptions } from "@/services/direct-campaigns.service";
import type { CampaignFormValues, CampaignSubmitResult, ReachCriteria } from "@/types/direct-campaign";
import { MAX_IMAGES, todayISO, validateCampaign } from "./campaign-form-rules";

// Server Actions are reachable by direct POST, so everything is re-validated here.
// TODO: once accounts exist, require a signed-in brand user before creating the campaign.
// TODO: reference images are only counted for now; upload them to storage once it exists.
export async function submitCampaign(formData: FormData): Promise<CampaignSubmitResult> {
  const read = (field: string) => {
    const value = formData.get(field);
    return typeof value === "string" ? value.trim() : "";
  };
  const readAll = (field: string) =>
    formData.getAll(field).filter((value): value is string => typeof value === "string");

  const values: CampaignFormValues = {
    title: read("title"),
    niche: read("niche"),
    budget: read("budget"),
    startDate: read("startDate"),
    endDate: read("endDate"),
    deliverables: read("deliverables"),
    minEngagement: read("minEngagement") || "any",
  };
  const ageRanges = readAll("ageRanges");
  const locations = readAll("locations");
  const interests = readAll("interests");

  const options = await getCampaignFormOptions();
  const isKnown = (list: { value: string }[], value: string) => list.some((option) => option.value === value);

  // One day of leniency so a brand in a different timezone isn't rejected for posting "today".
  const errors = validateCampaign(values, todayISO(-1));
  if (values.niche && !isKnown(options.niches, values.niche)) errors.niche = "Choose one of the niches listed.";
  if (!isKnown(options.engagementLevels, values.minEngagement)) {
    errors.minEngagement = "Choose one of the engagement levels listed.";
  }

  const listsAreValid =
    ageRanges.every((value) => isKnown(options.ageRanges, value)) &&
    locations.every((value) => isKnown(options.locations, value)) &&
    interests.every((value) => isKnown(options.interests, value));

  if (Object.keys(errors).length > 0 || !listsAreValid) {
    return { status: "error", errors, message: "Please fix the highlighted fields and try again." };
  }

  const imageCount = Number(read("referenceImageCount"));
  const campaign = await createCampaign({
    title: values.title,
    niche: values.niche,
    budget: Number(values.budget),
    startDate: values.startDate,
    endDate: values.endDate,
    deliverables: values.deliverables,
    minEngagement: values.minEngagement,
    ageRanges,
    locations,
    interests,
    referenceImageCount: Number.isInteger(imageCount) ? Math.min(Math.max(imageCount, 0), MAX_IMAGES) : 0,
  });

  return { status: "success", campaign };
}

// Powers the live "influencers you'd reach" estimate next to the submit button.
export async function estimateReach(criteria: ReachCriteria): Promise<number> {
  return estimateCampaignReach({
    niche: typeof criteria.niche === "string" ? criteria.niche : "",
    locations: Array.isArray(criteria.locations) ? criteria.locations.filter((value) => typeof value === "string") : [],
    minEngagement: typeof criteria.minEngagement === "string" ? criteria.minEngagement : "any",
  });
}
