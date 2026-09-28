import { getCurrentBrandAccount } from "@/services/accounts.service";
import { CampaignPreview } from "./sections/campaign-preview";

export async function CampaignPreviewPage({ draftId }: { draftId?: string }) {
  const account = await getCurrentBrandAccount();

  return (
    <div className="flex-1 bg-surface px-4 py-10 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <CampaignPreview draftId={draftId} brandName={account.name} />
      </div>
    </div>
  );
}
