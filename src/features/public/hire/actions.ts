"use server";

import { createHireRequest, getCampaignDurations } from "@/services/hire-requests.service";
import { getInfluencerProfile } from "@/services/influencers.service";
import type { HireFormField, HireFormState, HireFormValues } from "@/types/hire-request";
import { HANDLE_PATTERN, PROMOTION_MAX } from "./hire-form-rules";

// Server Actions are reachable by direct POST, so every value is re-validated
// here against the influencer's real payment methods and durations.
// TODO: once accounts exist, require a signed-in brand user before creating the request.
export async function submitHireRequest(
  username: string,
  _previous: HireFormState,
  formData: FormData,
): Promise<HireFormState> {
  const read = (field: HireFormField) => {
    const value = formData.get(field);
    return typeof value === "string" ? value.trim() : "";
  };
  const values: HireFormValues = {
    fullName: read("fullName"),
    location: read("location"),
    socialHandle: read("socialHandle"),
    promotion: read("promotion"),
    paymentMethod: read("paymentMethod"),
    duration: read("duration"),
  };

  const profile = await getInfluencerProfile(username);
  if (!profile) {
    return { status: "error", values, errors: {}, message: "This influencer is no longer available." };
  }
  const durations = await getCampaignDurations(profile.minimumBooking);

  const errors: Partial<Record<HireFormField, string>> = {};
  if (values.fullName.length < 2) errors.fullName = "Enter your full name.";
  else if (values.fullName.length > 80) errors.fullName = "Keep your name under 80 characters.";
  if (values.location.length < 2) errors.location = "Enter your city and country.";
  else if (values.location.length > 80) errors.location = "Keep your location under 80 characters.";
  if (values.socialHandle && !HANDLE_PATTERN.test(values.socialHandle)) {
    errors.socialHandle = "Use a handle like @yourbrand (letters, numbers, dots and underscores).";
  }
  if (values.promotion.length > PROMOTION_MAX) {
    errors.promotion = `Keep this under ${PROMOTION_MAX} characters.`;
  }
  if (!profile.paymentMethods.includes(values.paymentMethod)) {
    errors.paymentMethod = "Choose one of the payment methods listed.";
  }
  if (!durations.some((duration) => duration.value === values.duration)) {
    errors.duration = `Choose a duration of at least ${profile.minimumBooking}.`;
  }

  if (Object.keys(errors).length > 0) {
    return { status: "error", values, errors, message: "Please fix the highlighted fields and try again." };
  }

  const socialHandle = values.socialHandle && `@${values.socialHandle.replace(/^@/, "")}`;
  const request = await createHireRequest({
    influencerId: profile.id,
    fullName: values.fullName,
    location: values.location,
    socialHandle: socialHandle || undefined,
    promotion: values.promotion || undefined,
    paymentMethod: values.paymentMethod,
    duration: values.duration,
  });

  return { status: "success", values, request };
}
