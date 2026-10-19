import { redirect } from "next/navigation";
import { isUuid } from "@/lib/api/endpoints";

/**
 * Compatibility route: the old preview page showed made-up creator matches, which the platform cannot compute before approval. A saved
 * draft (by its real id) opens in the campaign form; anything else goes to a new campaign.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ draft?: string | string[] }> }) {
  const { draft } = await searchParams;
  redirect(isUuid(draft) ? `/campaigns/new?draft=${draft}` : "/campaigns/new");
}
