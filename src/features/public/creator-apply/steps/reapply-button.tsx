"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { reapplyAction } from "@/features/creator-application/actions";
import { failureNotice } from "@/features/creator-application/messages";

/** After a rejection: starts a new draft (pre-filled by the API from the rejected one) and goes back to step 1. */
export function ReapplyButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [message, setMessage] = useState<string | null>(null);

  async function reapply() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const result = await reapplyAction();
      if (result.ok) {
        router.push("/for-creators/apply/profile");
        router.refresh();
        return;
      }
      setMessage(failureNotice(result.error, "/for-creators/apply/submitted").text);
    } catch {
      setMessage(failureNotice({ kind: "unavailable", requestId: null }, "/for-creators/apply/submitted").text);
    }
    inFlight.current = false;
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => void reapply()}
        disabled={busy}
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Starting…" : "Update and apply again"}
      </button>
      {message && (
        <p className="text-sm font-medium text-danger" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
