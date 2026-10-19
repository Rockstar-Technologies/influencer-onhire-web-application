import type { Metadata } from "next";
import { ApplicationDetailPage } from "@/features/admin/application-detail-page";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Application · Admin · Influencer On Hire" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdmin(`/admin/applications/${encodeURIComponent(id)}`, "applications.review");
  return <ApplicationDetailPage id={id} viewer={{ permissions: session.permissions }} />;
}
