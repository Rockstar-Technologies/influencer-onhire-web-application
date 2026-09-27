"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/types/user-management";

// Runs a server action and keeps its outcome around for an aria-live message.
export function useAdminAction() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    startTransition(async () => {
      const outcome = await action();
      setResult(outcome);
      if (outcome.ok) onSuccess?.();
    });
  }

  return { pending, result, run, clear: () => setResult(null) };
}
