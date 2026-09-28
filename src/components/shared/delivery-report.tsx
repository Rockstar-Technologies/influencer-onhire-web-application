import { FiExternalLink, FiFileText } from "react-icons/fi";
import { formatDate } from "@/lib/utils";
import type { DeliveryReport as Report } from "@/types/payments";

export function DeliveryReport({ report }: { report: Report }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        <FiFileText aria-hidden /> Delivery report · {formatDate(report.submittedAt)}
      </p>
      <p className="whitespace-pre-line text-sm text-heading">{report.summary}</p>
      <ul className="mt-2 space-y-1">
        {report.links.map((link) => (
          <li key={link}>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-navy hover:underline"
            >
              <span className="truncate">{link.replace(/^https?:\/\//, "")}</span>
              <FiExternalLink className="shrink-0" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
