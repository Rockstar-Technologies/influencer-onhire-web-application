import { ComingSoonPage } from "@/features/public/coming-soon/coming-soon-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ title?: string }>;
}) {
  const { title } = await searchParams;
  return <ComingSoonPage title={title} />;
}
