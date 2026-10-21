"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { offerFailureNotice } from "@/features/offers/failure";
import type { FailureNotice } from "@/features/offers/failure";
import { withdrawApplicationAction } from "./actions";
import { applyFailureNotice } from "./failure";

/** Withdraws the creator's own PENDING application, after asking. Refreshes from the API once it confirmed. */
export function WithdrawButton({ offerId, returnTo }: { offerId: string; returnTo: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<FailureNotice | null>(null);
  const inFlight = useRef(false);

  async function run() {
    if (inFlight.current) return;
    if (!window.confirm("Withdraw this application? You won't be able to apply to this campaign again.")) return;
    inFlight.current = true;
    setBusy(true);
    setNotice(null);
    try {
      const result = await withdrawApplicationAction({ id: offerId });
      if (result.ok) return void router.refresh();
      setNotice(applyFailureNotice(result.error, returnTo));
      if (result.error.kind === "conflict" || result.error.kind === "not_found") router.refresh();
    } catch {
      setNotice(offerFailureNotice({ kind: "unavailable", requestId: null }, returnTo, { href: "/creator/campaigns", label: "Back to campaigns" }));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" disabled={busy} onClick={() => void run()} className="rounded-lg border border-danger/40 px-5 py-2.5 text-sm font-semibold text-danger hover:bg-danger-light disabled:cursor-not-allowed disabled:opacity-60">
        {busy ? "Withdrawing…" : "Withdraw application"}
      </button>
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
    </div>
  );
}
