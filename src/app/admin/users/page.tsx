import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { UsersPage } from "@/features/admin-panel/users/users-page";
import { parseUserQuery, type RawSearchParams } from "@/features/admin-panel/users/user-query";

export const metadata: Metadata = { title: "User Management · Admin · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireAdmin("/admin/users", "users.view");
  return <UsersPage query={parseUserQuery(await searchParams)} />;
}
