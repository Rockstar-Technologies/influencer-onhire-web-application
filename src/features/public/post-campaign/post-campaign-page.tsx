import Link from "next/link";
import { getPostCampaignGuide, listEngagementRateOptions } from "@/services/campaigns.service";
import { CampaignForm } from "./sections/campaign-form";
import { PostCampaignSidebar } from "./sections/post-campaign-sidebar";

export async function PostCampaignPage({ draftId }: { draftId?: string }) {
  const [guide, engagementOptions] = await Promise.all([getPostCampaignGuide(), listEngagementRateOptions()]);

  return (
    <div className="bg-surface-alt py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover">
          <span aria-hidden>←</span> Back to Home
        </Link>

        <header className="mx-auto mt-6 max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Step 1 of 1</p>
          <h1 className="mt-2 text-3xl font-extrabold text-heading sm:text-4xl">Campaign Details</h1>
          <p className="mt-3 text-sm leading-relaxed text-body">
            Tell us what you need — fields update with a green check as you complete them. Fields marked{" "}
            <span className="text-danger">*</span> are required; the &quot;Refine Your Reach&quot; section is optional and can
            be skipped.
          </p>
        </header>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
          <CampaignForm engagementOptions={engagementOptions} draftId={draftId} />
          <PostCampaignSidebar guide={guide} />
        </div>
      </div>
    </div>
  );
}
