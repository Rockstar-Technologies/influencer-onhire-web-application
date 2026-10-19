import type { Metadata } from "next";
import { ApplicationsPage } from "@/features/admin/applications-page";
import { parseApplicationQuery } from "@/features/admin/server";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Creator applications · Admin · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("/admin/applications", "applications.review");
  return <ApplicationsPage query={parseApplicationQuery(await searchParams)} />;
}
