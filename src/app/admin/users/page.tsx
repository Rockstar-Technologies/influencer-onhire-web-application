import type { Metadata } from "next";
import { UsersPage } from "@/features/admin/users-page";
import { parseUserQuery } from "@/features/admin/server";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Users · Admin · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("/admin/users", "users.view");
  return <UsersPage query={parseUserQuery(await searchParams)} />;
}
