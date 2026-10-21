"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { NotificationView } from "@/lib/api/schemas";
import { cn } from "@/lib/utils";
import { markAllNotificationsReadAction, markNotificationReadAction } from "./actions";
import { notificationFailureNotice } from "./failure";
import type { FailureNotice } from "./failure";
import { kindLabel, targetOf, toneOf, whenText } from "./mapping";
import type { NotificationArea } from "./mapping";

const TONE: Record<ReturnType<typeof toneOf>, string> = {
  good: "bg-success-light text-success-strong",
  attention: "bg-danger-light text-danger-strong",
  neutral: "bg-border-light text-body",
};

interface Props {
  area: NotificationArea;
  items: NotificationView[];
  unread: number;
}

/** The list with its two actions. Read state is only ever what the API holds: after each confirmed action the page is refreshed from the API. */
export function NotificationList({ area, items, unread }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | "all" | null>(null);
  const [notice, setNotice] = useState<FailureNotice | null>(null);
  const inFlight = useRef(false);
  const returnTo = `/${area}/notifications`;

  async function run(key: string | "all", action: () => Promise<{ ok: true } | { ok: false; error: Parameters<typeof notificationFailureNotice>[0] }>) {
    if (inFlight.current) return; // one change at a time; a double click must not send two
    inFlight.current = true;
    setBusy(key);
    setNotice(null);
    try {
      const result = await action();
      if (result.ok) {
        router.refresh();
        return;
      }
      setNotice(notificationFailureNotice(result.error, returnTo));
      if (result.error.kind === "not_found") router.refresh();
    } catch {
      setNotice(notificationFailureNotice({ kind: "unavailable", requestId: null }, returnTo));
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {unread > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void run("all", () => markAllNotificationsReadAction({}))}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-heading hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === "all" ? "Marking…" : "Mark all as read"}
          </button>
        </div>
      )}

      {notice && (
        <p role="alert" className="rounded-lg bg-danger-light px-4 py-3 text-sm text-danger">
          {notice.text}
          {notice.link && (
            <>
              {" "}
              <Link href={notice.link.href} className="font-semibold underline">
                {notice.link.label}
              </Link>
            </>
          )}
        </p>
      )}

      <ul className="space-y-3">
        {items.map((item) => {
          const target = targetOf(item.links, area);
          const isUnread = item.readAt === null;
          return (
            <li key={item.id} aria-label={`${isUnread ? "Unread: " : ""}${item.title}`} className={cn("rounded-2xl border bg-surface p-5 shadow-sm", isUnread ? "border-primary-border" : "border-border")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", TONE[toneOf(item.type)])}>{kindLabel(item.type)}</span>
                    {isUnread && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">New</span>}
                    <time dateTime={item.createdAt} className="text-xs text-muted">
                      {whenText(item.createdAt)}
                    </time>
                  </div>
                  <h2 className="mt-2 text-base font-bold text-heading">{item.title}</h2>
                  <p className="mt-1 whitespace-pre-line text-sm text-body">{item.body}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {target && (
                    <Link href={target.href} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                      {target.label}
                    </Link>
                  )}
                  {isUnread && (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void run(item.id, () => markNotificationReadAction({ id: item.id }))}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-heading hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy === item.id ? "Marking…" : "Mark as read"}
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
