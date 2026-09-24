import { CampaignPostedCard } from "./sections/campaign-posted-card";

export function CampaignPostedPage({ campaignId }: { campaignId?: string }) {
  return (
    <div className="flex flex-1 items-start justify-center bg-surface px-4 py-16 sm:py-20">
      <CampaignPostedCard campaignId={campaignId} />
    </div>
  );
}
