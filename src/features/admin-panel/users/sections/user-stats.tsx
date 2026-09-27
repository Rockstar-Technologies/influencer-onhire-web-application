import Link from "next/link";
import type { ReactNode } from "react";
import { FiArrowRight, FiClock, FiLock, FiSlash, FiUsers } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { getUserStats } from "@/services/user-management.service";

type Tone = "navy" | "warning" | "danger" | "success";

// Full class strings so Tailwind can see them at build time.
const TONES: Record<Tone, { card: string; icon: string; accent: string; watermark: string }> = {
  navy: {
    card: "border-navy/15 from-info-light hover:border-navy/35",
    icon: "bg-navy shadow-navy/25",
    accent: "bg-navy",
    watermark: "text-navy",
  },
  warning: {
    card: "border-warning/20 from-warning-light hover:border-warning/40",
    icon: "bg-warning shadow-warning/25",
    accent: "bg-warning",
    watermark: "text-warning",
  },
  danger: {
    card: "border-danger/20 from-danger-light hover:border-danger/40",
    icon: "bg-danger shadow-danger/25",
    accent: "bg-danger",
    watermark: "text-danger",
  },
  success: {
    card: "border-success/20 from-success-light hover:border-success/40",
    icon: "bg-success shadow-success/25",
    accent: "bg-success",
    watermark: "text-success",
  },
};

interface StatCard {
  label: string;
  value: string;
  unit?: string;
  hint: ReactNode;
  icon: typeof FiUsers;
  tone: Tone;
  href?: string;
}

function CardBody({ label, value, unit, hint, icon: Icon, tone, href }: StatCard) {
  const styles = TONES[tone];
  return (
    <>
      {/* Accent line that grows in from the left on hover. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100",
          styles.accent,
        )}
      />
      <Icon
        aria-hidden
        size={112}
        className={cn(
          "pointer-events-none absolute -bottom-6 -right-5 opacity-[0.07] transition-transform duration-500 motion-safe:group-hover:-rotate-12 motion-safe:group-hover:scale-110",
          styles.watermark,
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-body">{label}</p>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md transition-transform duration-300 motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-6",
            styles.icon,
          )}
        >
          <Icon size={18} aria-hidden />
        </span>
      </div>
      <p className="relative mt-3 flex items-baseline gap-1.5 font-display font-bold tracking-tight text-heading">
        <span className="text-3xl tabular-nums">{value}</span>
        {unit && <span className="text-base font-semibold text-muted">{unit}</span>}
      </p>
      <div className="relative mt-2 flex items-center justify-between gap-2 text-xs text-body">
        <span>{hint}</span>
        {href && (
          <FiArrowRight
            aria-hidden
            className="shrink-0 text-navy opacity-0 transition-all duration-300 motion-safe:-translate-x-1 group-hover:opacity-100 motion-safe:group-hover:translate-x-0"
          />
        )}
      </div>
    </>
  );
}

// Tinted gradient cards so the KPI row reads apart from the plain white panels below it.
const cardClass = (tone: Tone) =>
  cn(
    "group relative block h-full overflow-hidden rounded-2xl border bg-linear-to-br via-surface to-surface p-5 shadow-md shadow-heading/5 transition-all duration-300 ease-out hover:shadow-xl hover:shadow-heading/10 motion-safe:hover:-translate-y-1",
    TONES[tone].card,
  );

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
      tone: "success",
    },
  ];

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <li key={card.label}>
          {card.href ? (
            <Link
              href={card.href}
              scroll={false}
              className={cn(cardClass(card.tone), "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30")}
            >
              <CardBody {...card} />
            </Link>
          ) : (
            <div className={cardClass(card.tone)}>
              <CardBody {...card} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
