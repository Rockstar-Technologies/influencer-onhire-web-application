import type { Metadata } from "next";
import { UsersPage } from "@/features/admin-panel/users/users-page";
import { parseUserQuery, type RawSearchParams } from "@/features/admin-panel/users/user-query";

export const metadata: Metadata = { title: "User Management · Admin · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return <UsersPage query={parseUserQuery(await searchParams)} />;
}
