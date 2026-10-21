import { loadCreatorInbox } from "@/features/offers/server";
import { RequestsBoard } from "./requests-board";

/** The creator's inbox: direct hires and platform invitations waiting for an answer, and everything answered before. All from the API. */
export async function CampaignRequestsPage({ query, cursor }: { query: string; cursor?: string }) {
  const inbox = await loadCreatorInbox({ ...(cursor ? { cursor } : {}) });
  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <RequestsBoard query={query} pending={inbox.pending.items} pendingTruncated={inbox.pending.nextCursor !== null} history={inbox.history.items} nextCursor={inbox.history.nextCursor} reasons={inbox.reasons} />
    </div>
  );
}
