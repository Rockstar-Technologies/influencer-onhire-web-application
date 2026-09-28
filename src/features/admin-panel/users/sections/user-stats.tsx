import { FiClock, FiLock, FiSlash, FiUsers } from "react-icons/fi";
import { getUserStats } from "@/services/user-management.service";
import { StatCardGrid, type StatCard } from "../../stat-cards";

export async function UserStats() {
  const stats = await getUserStats();
  const cards: StatCard[] = [
    {
      label: "Total Users",
      value: String(stats.total),
      hint: (
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            {stats.influencers} influencers
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-navy" aria-hidden />
            {stats.brands} brands
          </span>
        </span>
      ),
      icon: FiUsers,
      tone: "navy",
      href: "/admin/users",
    },
    {
      label: "Pending Approval",
      value: String(stats.pendingApproval),
      hint: stats.pendingApproval ? "Waiting for your review" : "All caught up",
      icon: FiClock,
      tone: "warning",
      href: "/admin/users?status=pending",
    },
    {
      label: "Suspended",
      value: String(stats.suspended),
      hint: "Cannot join or post campaigns",
      icon: FiSlash,
      tone: "danger",
      href: "/admin/users?status=suspended",
    },
    {
      label: "Held in Escrow",
      value: stats.inEscrow.toLocaleString("en-US"),
      unit: "Frs",
      hint: "Released when work is approved",
      icon: FiLock,
      tone: "warning",
    },
  ];

  return <StatCardGrid cards={cards} />;
}
