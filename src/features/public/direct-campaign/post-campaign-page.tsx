import { getCampaignFormOptions, getCampaignGuidance } from "@/services/direct-campaigns.service";
import { CampaignHeader } from "./sections/campaign-header";
import { CampaignSidebar } from "./sections/campaign-sidebar";
import { CampaignWorkspace } from "./sections/campaign-workspace";

export async function PostCampaignPage() {
  const [options, guidance] = await Promise.all([getCampaignFormOptions(), getCampaignGuidance()]);

  return (
    <div className="bg-surface-alt px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <CampaignWorkspace options={options} header={<CampaignHeader />} sidebar={<CampaignSidebar guidance={guidance} />} />
      </div>
    </div>
  );
}
