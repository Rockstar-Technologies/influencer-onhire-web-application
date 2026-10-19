import type { Metadata } from "next";
import { NotificationsPage } from "@/features/notifications/notifications-page";
import { requireBrand } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Notifications · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<{ unread?: string | string[]; cursor?: string | string[] }> }) {
  await requireBrand("/brand/notifications");
  const { unread, cursor } = await searchParams;
  return <NotificationsPage area="brand" {...(unread === "true" ? { unread: true } : {})} {...(typeof cursor === "string" ? { cursor } : {})} />;
}
