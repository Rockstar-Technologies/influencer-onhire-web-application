import { SubmittedView } from "./steps/submitted-view";

export function CreatorSubmittedPage({ applicationId }: { applicationId?: string }) {
  return (
    <div className="flex-1 bg-surface-alt px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <SubmittedView applicationId={applicationId} />
      </div>
    </div>
  );
}
