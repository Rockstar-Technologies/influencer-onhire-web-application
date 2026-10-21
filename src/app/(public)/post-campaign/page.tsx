import { redirect } from "next/navigation";

/** Compatibility route: `/post-campaign` is now `/campaigns/new` (the canonical campaign form). */
export default function Page() {
  redirect("/campaigns/new");
}
