import type { Metadata } from "next";
import { UserDetailPage } from "@/features/admin/user-detail-page";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "User · Admin · Influencer On Hire" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdmin(`/admin/users/${encodeURIComponent(id)}`, "users.view");
  return <UserDetailPage id={id} viewer={{ id: session.user.id, permissions: session.permissions }} />;
}
