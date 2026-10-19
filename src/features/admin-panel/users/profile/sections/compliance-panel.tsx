import { FiFileText } from "react-icons/fi";
import { StatusBadge, type BadgeStyle } from "@/components/shared/status-badge";
import { formatRelativeTimeInline } from "@/lib/utils";
import type { AccountType, ComplianceDocument, ComplianceDocumentKind } from "@/types/user-management";

const KIND_LABELS: Record<ComplianceDocumentKind, string> = {
  contract: "Signed agreement",
  tax_id: "Tax ID",
  business_registration: "Business registration",
  national_id: "National ID",
};

// What each account type must upload before it can be paid or post campaigns.
const REQUIRED: Record<AccountType, ComplianceDocumentKind[]> = {
  creator: ["national_id", "tax_id", "contract"],
  brand: ["business_registration", "tax_id"],
};

const STATUS_STYLES: Record<ComplianceDocument["status"], BadgeStyle> = {
  verified: { label: "Verified", badge: "bg-success-light text-success-strong", dot: "bg-success" },
  in_review: { label: "In review", badge: "bg-warning-light text-warning", dot: "bg-warning" },
  rejected: { label: "Rejected", badge: "bg-danger-light text-danger-strong", dot: "bg-danger" },
};

export function CompliancePanel({ type, documents }: { type: AccountType; documents: ComplianceDocument[] }) {
  const missing = REQUIRED[type].filter((kind) => !documents.some((doc) => doc.kind === kind && doc.status !== "rejected"));

  return (
    <section aria-labelledby="compliance-heading" className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 id="compliance-heading" className="font-display text-base font-bold text-heading">
        Legal &amp; Tax Documents
      </h2>
      <p className="mt-1 text-sm text-muted">Uploaded by the user for identity, tax and contract compliance.</p>

      {documents.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <FiFileText className="shrink-0 text-muted" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-heading">{KIND_LABELS[doc.kind]}</p>
                  <p className="truncate text-xs text-muted">
                    {doc.fileName} · uploaded {formatRelativeTimeInline(doc.uploadedAt)}
                  </p>
                </div>
              </div>
              <StatusBadge {...STATUS_STYLES[doc.status]} />
            </li>
          ))}
        </ul>
      )}

      {missing.length > 0 && (
        <div className="mt-3 rounded-lg bg-danger-light px-4 py-3 text-sm text-danger-strong">
          <span className="font-semibold">Still needed:</span> {missing.map((kind) => KIND_LABELS[kind]).join(", ")}
        </div>
      )}
    </section>
  );
}
