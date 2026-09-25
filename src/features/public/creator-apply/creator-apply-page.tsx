import { getCreatorApplicationOptions } from "@/services/creator-application.service";
import { ApplyShell } from "./apply-shell";
import type { ApplyStepId } from "./apply-shell";
import { AudienceStep } from "./steps/audience-step";
import { ProfileStep } from "./steps/profile-step";
import { RatesStep } from "./steps/rates-step";

const COPY: Record<ApplyStepId, { title: string; description: string }> = {
  profile: {
    title: "Tell brands who you are",
    description: "Your photo, niche and a short intro — the first things brands see on your profile.",
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

export async function CreatorApplyPage({ step }: { step: ApplyStepId }) {
  const options = await getCreatorApplicationOptions();

  return (
    <ApplyShell step={step} {...COPY[step]}>
      {step === "profile" && <ProfileStep options={options} />}
      {step === "audience" && <AudienceStep options={options} />}
      {step === "rates" && <RatesStep options={options} />}
    </ApplyShell>
  );
}
