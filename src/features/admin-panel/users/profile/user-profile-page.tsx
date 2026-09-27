import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import type { UserProfile } from "@/types/user-management";
import { CompliancePanel } from "./sections/compliance-panel";
import { DisputesPanel } from "./sections/disputes-panel";
import { NotificationsPanel } from "./sections/notifications-panel";
import { PerformancePanel } from "./sections/performance-panel";
import { ProfileHeader } from "./sections/profile-header";
import { WalletPanel } from "./sections/wallet-panel";

export function UserProfilePage({ profile }: { profile: UserProfile }) {
  const { user } = profile;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-semibold text-body hover:text-navy">
        <FiArrowLeft aria-hidden /> All users
      </Link>

      <ProfileHeader user={user} />
      <PerformancePanel type={user.type} performance={profile.performance} trend={profile.trend} disputes={profile.disputes} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <WalletPanel wallet={user.wallet} transactions={profile.transactions} />
        <DisputesPanel disputes={profile.disputes} />
        <CompliancePanel type={user.type} documents={profile.documents} />
        <NotificationsPanel notifications={profile.notifications} />
      </div>
    </div>
  );
}
