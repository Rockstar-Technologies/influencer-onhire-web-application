import { redirect } from "next/navigation";
import { audienceFromState, profileFromState, ratesFromState } from "@/features/creator-application/mapping";
import { APPLY_BASE, SUBMITTED_PATH, loadWizard } from "@/features/creator-application/server";
import { ApplyShell } from "./apply-shell";
import type { ApplyStepId } from "./apply-shell";
import { AudienceStep } from "./steps/audience-step";
import { ProfileStep } from "./steps/profile-step";
import { RatesStep } from "./steps/rates-step";

const COPY: Record<ApplyStepId, { title: string; description: string }> = {
  profile: {
    title: "Tell brands who you are",
    description: "Your niche, city and a short intro — the first things brands see on your profile.",
  },
  audience: {
    title: "Show your reach",
    description: "Where you post, who you've worked with, and the brands you'd love to work with.",
  },
  rates: {
    title: "Set your rates & get paid",
    description: "Your prices, the terms of a booking, and where we send your earnings.",
  },
};

/**
 * One step of the application, rendered from what the SERVER holds (the API's view of the signed-in creator's draft). A step is only shown
 * while the application is a draft: once it is submitted the person is taken to its status page.
 */
export async function CreatorApplyPage({ step }: { step: ApplyStepId }) {
  const { state, options } = await loadWizard(`${APPLY_BASE}/${step}`);
  if (state.application.status !== "draft") redirect(SUBMITTED_PATH);
  if (step !== "profile" && !state.progress.profile.complete) redirect(`${APPLY_BASE}/profile`);
  if (step === "rates" && state.audience.platforms.length === 0) redirect(`${APPLY_BASE}/audience`);

  const profile = profileFromState(state);

  return (
    <ApplyShell step={step} {...COPY[step]}>
      {step === "profile" && <ProfileStep options={options} initial={profile.form} preserved={profile.preserved} />}
      {step === "audience" && <AudienceStep options={options} initial={audienceFromState(state, options)} />}
      {step === "rates" && (
        <RatesStep options={options} initial={ratesFromState(state, options)} platforms={state.audience.platforms.map((p) => p.platform)} />
      )}
    </ApplyShell>
  );
}
