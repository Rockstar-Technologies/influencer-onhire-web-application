import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/types/user-management";

export function ResultMessage({ result, className }: { result: ActionResult | null; className?: string }) {
  return (
    <p aria-live="polite" className={cn("text-xs font-medium", result?.ok ? "text-success-strong" : "text-danger", className)}>
      {result && (
        <span className="inline-flex items-center gap-1.5">
          {result.ok ? <FiCheckCircle aria-hidden /> : <FiAlertCircle aria-hidden />}
          {result.message}
        </span>
      )}
    </p>
  );
}
