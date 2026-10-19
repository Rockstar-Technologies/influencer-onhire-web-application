import { redirect } from "next/navigation";
import { requireBrand } from "@/lib/auth/session";

/** Compatibility route: the brand's payments live at `/brand/payments` (real data). The old mock dashboard page is gone. */
export default async function Page() {
  await requireBrand("/brand/campaign-payments");
  redirect("/brand/payments");
}
