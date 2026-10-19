import { redirect } from "next/navigation";
import { isUuid } from "@/lib/api/endpoints";

/** Compatibility route for old "campaign posted" links: the campaign's own page now shows its real status. */
export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string | string[] }> }) {
  const { id } = await searchParams;
  redirect(isUuid(id) ? `/brand/campaigns/${id}?submitted=1` : "/brand/campaigns");
}
