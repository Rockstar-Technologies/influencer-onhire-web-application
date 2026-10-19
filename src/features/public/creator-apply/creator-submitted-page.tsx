import { redirect } from "next/navigation";
import { SUBMITTED_PATH, loadWizard, pathForNextStep } from "@/features/creator-application/server";
import { SubmittedView } from "./steps/submitted-view";

/** The status of the signed-in creator's application, read from the API. A draft that was never submitted goes back to the step it is on. */
export async function CreatorSubmittedPage() {
  const { state, options } = await loadWizard(SUBMITTED_PATH);
  if (state.application.status === "draft") redirect(pathForNextStep(state));

  return (
    <div className="flex-1 bg-surface-alt px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <SubmittedView state={state} options={options} />
      </div>
    </div>
  );
}
