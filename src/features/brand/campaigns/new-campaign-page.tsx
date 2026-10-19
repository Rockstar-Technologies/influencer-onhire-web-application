import { notFound, redirect } from "next/navigation";
import { isUuid } from "@/lib/api/endpoints";
import { EMPTY_CAMPAIGN_FORM, campaignToForm } from "@/features/brand-campaigns/mapping";
import { CAMPAIGNS_PATH, NEW_CAMPAIGN_PATH, loadCampaign, loadCampaignOptions } from "@/features/brand-campaigns/server";
import { CampaignForm } from "./campaign-form";
import { CampaignHeader } from "./campaign-header";
import { CampaignSidebar } from "./campaign-sidebar";
import { CAMPAIGN_GUIDANCE } from "./guidance";

/** A new campaign, or (with `?draft=<id>`) one of the brand's own saved drafts. Only drafts can be edited; anything else goes to its status page. */
export async function NewCampaignPage({ draftId, budget }: { draftId?: string; budget?: string }) {
  if (draftId !== undefined && !isUuid(draftId)) notFound();
  const returnTo = draftId ? `${NEW_CAMPAIGN_PATH}?draft=${draftId}` : NEW_CAMPAIGN_PATH;
  const [options, draft] = await Promise.all([loadCampaignOptions(returnTo), draftId ? loadCampaign(draftId, returnTo) : Promise.resolve(null)]);
  if (draft && draft.status !== "draft") redirect(`${CAMPAIGNS_PATH}/${draft.id}`);

  return (
    <div className="bg-surface-alt px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <CampaignHeader title={draft ? "Edit your draft" : "Campaign Details"} />
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <CampaignForm options={options} draftId={draft?.id ?? null} initial={draft ? campaignToForm(draft) : { ...EMPTY_CAMPAIGN_FORM, budget: typeof budget === "string" && /^\d{1,10}$/.test(budget) ? budget : "" }} />
          <aside aria-label="About posting a campaign" className="space-y-6">
            <CampaignSidebar guidance={CAMPAIGN_GUIDANCE} />
          </aside>
        </div>
      </div>
    </div>
  );
}
