import Link from "next/link";
import { FiFlag } from "react-icons/fi";
import { formatRelativeTime } from "@/lib/utils";
import { listModerationFlags } from "@/services/user-management.service";
import type { FlaggedField } from "@/types/user-management";
import { ModerationActions } from "./moderation-actions";

const FIELD_LABELS: Record<FlaggedField, string> = {
  bio: "Profile bio",
  campaign_description: "Campaign description",
  media: "Uploaded media",
};

export async function ModerationQueue() {
  const flags = await listModerationFlags();

  return (
    <section aria-labelledby="moderation-heading" className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 id="moderation-heading" className="scroll-mt-28 flex items-center gap-2 font-display text-base font-bold text-heading">
          <FiFlag className="text-navy" aria-hidden />
          Content Moderation
        </h2>
        <span className="rounded-full bg-border-light px-2.5 py-0.5 text-xs font-semibold text-body">{flags.length} to review</span>
      </div>
      <p className="mt-1 text-sm text-muted">Bios, campaign descriptions and media reported by users or filters.</p>

      {flags.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
          Nothing waiting for review.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {flags.map((flag) => (
            <li key={flag.id} className="py-4 first:pt-0 last:pb-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {FIELD_LABELS[flag.field]} ·{" "}
                <Link href={`/admin/users/${flag.userId}`} className="normal-case tracking-normal text-navy hover:underline">
                  {flag.userName}
                </Link>
              </p>
              <blockquote className="mt-2 rounded-lg border-l-2 border-warning bg-surface-alt px-3 py-2 text-sm text-heading">
                {flag.excerpt}
              </blockquote>
              <p className="mt-2 text-sm text-body">
                {flag.reason} · <time dateTime={flag.reportedAt} className="text-muted">{formatRelativeTime(flag.reportedAt)}</time>
              </p>
              <ModerationActions flagId={flag.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
