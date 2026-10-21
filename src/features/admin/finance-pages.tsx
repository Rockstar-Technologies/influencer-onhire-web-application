import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { formatFcfa } from "@/lib/format";
import type { PermissionCode } from "@/lib/domain/vocabulary";
import { FOLLOW_UP_TEXT, METHOD_TEXT, REFUND_REQUEST_TEXT, REFUND_REQUEST_TONE, REFUND_TEXT, REFUND_TONE, WITHDRAWAL_TEXT, WITHDRAWAL_TONE, humanize } from "./finance-mapping";
import { REFUND_FOLLOW_UPS, REFUND_REQUEST_STATUSES, REFUND_STATUSES, WITHDRAWAL_STATUSES, loadAttention, loadDiagnostics, loadIssue, loadIssues, loadReadiness, loadRefund, loadRefundRequest, loadRefundRequests, loadRefunds, loadWithdrawal, loadWithdrawals } from "./finance-server";
import type { IssueQuery, RefundQuery, RefundRequestQuery, WithdrawalQuery } from "./finance-server";
import { IssueDecision, RefundCancel, RefundRequestDecision, WithdrawalDecision } from "./finance-decisions";
import { dateTime, label } from "./mapping";
import { AdminHeader, Card, Empty, Facts, FilterChips, MoreLink, Pill, queryHref } from "./ui";

const Back = ({ href, children }: { href: string; children: string }) => (
  <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover">
    <FiArrowLeft aria-hidden />
    {children}
  </Link>
);
const Th = ({ children, right }: { children: string; right?: boolean }) => <th className={`px-4 py-3${right ? " text-right" : ""}`}>{children}</th>;

// ---- refund review requests -------------------------------------------------------------------------------------------------------

export async function RefundRequestsPage({ query }: { query: RefundRequestQuery }) {
  const page = await loadRefundRequests(query);
  const BASE = "/admin/refund-requests";
  const href = (change: Partial<Record<keyof RefundRequestQuery, string | boolean | null>>) => queryHref(BASE, { status: query.status, followUp: query.followUp, needsAction: query.needsAction, ...change });
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminHeader title="Refund requests" text="Brands ask for a refund review after a campaign. A request is not a refund: accepting records a decision only, and any refund is recorded separately from the payment." />
      <div className="space-y-3">
        <FilterChips label="Filter by status" current={query.status ?? null} href={(value) => href({ status: value })} options={[{ value: null, text: "Any status" }, ...REFUND_REQUEST_STATUSES.map((value) => ({ value, text: REFUND_REQUEST_TEXT[value] as string }))]} />
        <FilterChips label="Filter by follow-up" current={query.needsAction ? "needs" : (query.followUp ?? null)} href={(value) => href({ needsAction: value === "needs", followUp: value && value !== "needs" ? value : null })} options={[{ value: null, text: "All" }, { value: "needs", text: "Needs action" }, ...REFUND_FOLLOW_UPS.map((value) => ({ value, text: FOLLOW_UP_TEXT[value] as string }))]} />
      </div>
      {page.items.length === 0 ? (
        <Empty>No refund requests match.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead>
              <tr className="bg-surface-alt text-[11px] font-semibold uppercase tracking-wider text-muted">
                <Th>Payment</Th>
                <Th>Brand</Th>
                <Th right>Amount</Th>
                <Th>Requested</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {page.items.map((request) => (
                <tr key={request.id}>
                  <td className="px-4 py-3.5">
                    <Link href={`${BASE}/${request.id}`} className="font-semibold text-heading hover:text-primary">{request.reference}</Link>
                  </td>
                  <td className="px-4 py-3.5 text-body">{request.brand.name}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums">{formatFcfa(request.payment.amountXaf)}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-body">{dateTime(request.requestedAt)}</td>
                  <td className="px-4 py-3.5">
                    <Pill tone={(REFUND_REQUEST_TONE as Record<string, "good" | "wait" | "bad" | "neutral" | "warn">)[request.status] ?? "neutral"}>{label(REFUND_REQUEST_TEXT, request.status)}</Pill>
                    {request.status === "accepted" && request.followUp && <span className="mt-1 block text-xs text-muted">{label(FOLLOW_UP_TEXT, request.followUp)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {page.nextCursor && <MoreLink href={href({ cursor: page.nextCursor })} />}
    </div>
  );
}

export async function RefundRequestDetailPage({ id, permissions }: { id: string; permissions: readonly PermissionCode[] }) {
  const request = await loadRefundRequest(id);
  const may = permissions.includes("payments.refund");
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Back href="/admin/refund-requests">Back to refund requests</Back>
      <AdminHeader title={`Refund request for ${request.reference}`} text={`${request.brand.name} · ${formatFcfa(request.payment.amountXaf)}`} action={<Pill tone={(REFUND_REQUEST_TONE as Record<string, "good" | "wait" | "bad" | "neutral" | "warn">)[request.status] ?? "neutral"}>{label(REFUND_REQUEST_TEXT, request.status)}</Pill>} />
      <p className="rounded-xl border border-info/20 bg-info-light px-4 py-3 text-sm text-navy">A review request is not a refund. No money has been returned by this request.</p>
      <Card title="Request">
        <Facts items={[["Reason", request.reason], ["Requested", dateTime(request.requestedAt)], ["Engagement ended", request.engagementEndedOn ?? "—"], ["Payment", <Link key="p" className="text-primary underline" href={`/admin/payments/${request.payment.id}`}>{request.payment.reference}</Link>], ["Payment status", label({ held: "Held in escrow", requested: "Delivery reported", released: "Released", refund_pending: "Refund pending", refunded: "Refunded" }, request.paymentStatus)]]} />
      </Card>
      {(request.decidedAt || request.withdrawnAt) && (
        <Card title="Decision">
          <Facts items={[["Decided", dateTime(request.decidedAt)], ["Withdrawn", dateTime(request.withdrawnAt)], ["Note", request.decisionNote ?? "—"], ["Follow-up", request.followUp ? label(FOLLOW_UP_TEXT, request.followUp) : "—"]]} />
          {request.refund && <p className="mt-3 text-sm text-body">Refund {request.refund.status}{request.refund.simulated ? " (simulated)" : ""}. <Link className="text-primary underline" href={`/admin/refunds/${request.refund.id}`}>Open the refund</Link>. No real money has been returned.</p>}
        </Card>
      )}
      <Card title="Decide">
        {may ? <RefundRequestDecision id={request.id} canDecide={request.canDecide} /> : <p className="text-sm text-muted">Your role can see refund requests but not decide them.</p>}
      </Card>
    </div>
  );
}

// ---- refunds ----------------------------------------------------------------------------------------------------------------------

export async function RefundsPage({ query }: { query: RefundQuery }) {
  const page = await loadRefunds(query);
  const BASE = "/admin/refunds";
  const href = (change: Partial<Record<keyof RefundQuery, string | null>>) => queryHref(BASE, { status: query.status, ...change });
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminHeader title="Refunds" text="Recorded refunds of held payments. No provider refund exists: a simulated refund moves no money, and a real one is only a recorded decision. No money has been returned by any refund listed here." />
      <FilterChips label="Filter by status" current={query.status ?? null} href={(value) => href({ status: value })} options={[{ value: null, text: "Any status" }, ...REFUND_STATUSES.map((value) => ({ value, text: REFUND_TEXT[value] as string }))]} />
      {page.items.length === 0 ? (
        <Empty>No refunds match.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead>
              <tr className="bg-surface-alt text-[11px] font-semibold uppercase tracking-wider text-muted">
                <Th>Refund</Th>
                <Th right>Amount</Th>
                <Th>Recorded</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {page.items.map((refund) => (
                <tr key={refund.id}>
                  <td className="px-4 py-3.5"><Link href={`${BASE}/${refund.id}`} className="font-semibold text-heading hover:text-primary">INV-{refund.invoiceNo}</Link></td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums">{formatFcfa(refund.amountXaf)}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-body">{dateTime(refund.requestedAt)}</td>
                  <td className="px-4 py-3.5"><span className="inline-flex flex-wrap gap-2"><Pill tone={(REFUND_TONE as Record<string, "good" | "warn" | "neutral">)[refund.status] ?? "neutral"}>{label(REFUND_TEXT, refund.status)}</Pill>{refund.simulated && <Pill tone="warn">Simulated</Pill>}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {page.nextCursor && <MoreLink href={href({ cursor: page.nextCursor })} />}
    </div>
  );
}

export async function RefundDetailPage({ id, permissions }: { id: string; permissions: readonly PermissionCode[] }) {
  const refund = await loadRefund(id);
  const may = permissions.includes("payments.refund");
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Back href="/admin/refunds">Back to refunds</Back>
      <AdminHeader title={`Refund of INV-${refund.invoiceNo}`} text={formatFcfa(refund.amountXaf)} action={<span className="flex gap-2"><Pill tone={(REFUND_TONE as Record<string, "good" | "warn" | "neutral">)[refund.status] ?? "neutral"}>{label(REFUND_TEXT, refund.status)}</Pill>{refund.simulated && <Pill tone="warn">Simulated</Pill>}</span>} />
      <p className="rounded-xl border border-warning/30 bg-warning-light px-4 py-3 text-sm font-medium text-warning">{refund.note} No real money has been returned.</p>
      <Card title="Refund">
        <Facts items={[["Reason", refund.reason], ["Recorded", dateTime(refund.requestedAt)], ["Completed", dateTime(refund.completedAt)], ["Cancelled", dateTime(refund.cancelledAt)], ["Cancel note", refund.cancelNote ?? "—"], ["Payment", <Link key="p" className="text-primary underline" href={`/admin/payments/${refund.paymentId}`}>Open the payment</Link>], ["Review request", refund.refundRequest ? <Link key="r" className="text-primary underline" href={`/admin/refund-requests/${refund.refundRequest.id}`}>Open the request</Link> : "None"]]} />
      </Card>
      <Card title="Cancel">{may ? <RefundCancel id={refund.id} canCancel={refund.canCancel} /> : <p className="text-sm text-muted">Your role can see refunds but not cancel them.</p>}</Card>
    </div>
  );
}

// ---- withdrawal review ------------------------------------------------------------------------------------------------------------

export async function WithdrawalsPage({ query }: { query: WithdrawalQuery }) {
  const page = await loadWithdrawals(query);
  const BASE = "/admin/withdrawals";
  const href = (change: Partial<Record<keyof WithdrawalQuery, string | boolean | null>>) => queryHref(BASE, { status: query.status, needsReview: query.needsReview, ...change });
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminHeader title="Withdrawals" text="Creators' withdrawal requests. Every request is reviewed by Finance. No payout provider is connected, so approving only clears a request for a future payout: nothing is paid." />
      <div className="space-y-3">
        <FilterChips label="Filter by status" current={query.status ?? null} href={(value) => href({ status: value, needsReview: null })} options={[{ value: null, text: "Any status" }, ...WITHDRAWAL_STATUSES.map((value) => ({ value, text: WITHDRAWAL_TEXT[value] as string }))]} />
        <FilterChips label="Filter by review" current={query.needsReview ? "needs" : null} href={(value) => href({ needsReview: value === "needs", status: null })} options={[{ value: null, text: "All" }, { value: "needs", text: "Needs review" }]} />
      </div>
      {page.items.length === 0 ? (
        <Empty>No withdrawals match.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead>
              <tr className="bg-surface-alt text-[11px] font-semibold uppercase tracking-wider text-muted">
                <Th>Creator</Th>
                <Th right>Amount</Th>
                <Th>Network</Th>
                <Th>Requested</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {page.items.map((w) => (
                <tr key={w.id}>
                  <td className="px-4 py-3.5"><Link href={`${BASE}/${w.id}`} className="font-semibold text-heading hover:text-primary">{w.creator.displayName}</Link></td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums">{formatFcfa(w.amountXaf)}</td>
                  <td className="px-4 py-3.5 text-body">{METHOD_TEXT[w.destination.method] ?? w.destination.method}{w.destination.last3 ? ` …${w.destination.last3}` : ""}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-body">{dateTime(w.requestedAt)}</td>
                  <td className="px-4 py-3.5"><Pill tone={(WITHDRAWAL_TONE as Record<string, "good" | "wait" | "bad" | "neutral" | "warn">)[w.status] ?? "neutral"}>{label(WITHDRAWAL_TEXT, w.status)}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {page.nextCursor && <MoreLink href={href({ cursor: page.nextCursor })} />}
    </div>
  );
}

export async function WithdrawalDetailPage({ id, permissions }: { id: string; permissions: readonly PermissionCode[] }) {
  const w = await loadWithdrawal(id);
  const may = permissions.includes("withdrawals.review");
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Back href="/admin/withdrawals">Back to withdrawals</Back>
      <AdminHeader title={`Withdrawal of ${formatFcfa(w.amountXaf)}`} text={`${w.creator.displayName} (@${w.creator.username})`} action={<Pill tone={(WITHDRAWAL_TONE as Record<string, "good" | "wait" | "bad" | "neutral" | "warn">)[w.status] ?? "neutral"}>{label(WITHDRAWAL_TEXT, w.status)}</Pill>} />
      <p className="rounded-xl border border-info/20 bg-info-light px-4 py-3 text-sm text-navy">No payout provider is connected. An approved withdrawal is only cleared for a future payout; nothing has been paid{w.status === "completed" ? ", except where the status above says completed" : ""}.</p>
      <Card title="Request">
        <Facts items={[["Network", `${METHOD_TEXT[w.destination.method] ?? w.destination.method}${w.destination.last3 ? ` …${w.destination.last3}` : ""}`], ["Requested", dateTime(w.requestedAt)], ["Closed", dateTime(w.closedAt)], ["Completed", dateTime(w.completedAt)], ["Failed", dateTime(w.failedAt)], ["Funds", "Real balance only (never simulated)"], ["Reviewed", dateTime(w.review.reviewedAt)], ["Review note", w.review.note ?? "—"], ["Internal review reasons", w.riskReasons && w.riskReasons.length > 0 ? w.riskReasons.map(humanize).join(", ") : "None"]]} />
      </Card>
      {w.ledger && w.ledger.length > 0 && (
        <Card title="Ledger entries for this request">
          <ul className="divide-y divide-border-light text-sm">
            {w.ledger.map((e) => <li key={e.id} className="flex justify-between py-2"><span>{humanize(e.entryType)}</span><span className="tabular-nums">{formatFcfa(e.amountXaf)}</span></li>)}
          </ul>
        </Card>
      )}
      <Card title="Decide">{may ? <WithdrawalDecision id={w.id} canApprove={w.canApprove} canReject={w.canReject} /> : <p className="text-sm text-muted">Your role can see withdrawals but not decide them.</p>}</Card>
    </div>
  );
}

// ---- reconciliation ---------------------------------------------------------------------------------------------------------------

export async function ReconciliationPage({ query }: { query: IssueQuery }) {
  const [page, attention, readiness, diagnostics] = await Promise.all([loadIssues(query), loadAttention("/admin/reconciliation"), loadReadiness(), loadDiagnostics()]);
  const BASE = "/admin/reconciliation";
  const href = (change: Partial<Record<keyof IssueQuery, string | boolean | null>>) => queryHref(BASE, { resolved: query.resolved ? true : null, ...change });
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminHeader title="Reconciliation" text="Payment exceptions and the state of the payment system. A resolution is an audited note: it never changes a payment." />
      {readiness && (
        <Card title="Readiness for real payments">
          <p className="text-sm text-body">{readiness.ready ? "No blocking problem was found." : "Not ready for real payments:"}</p>
          {readiness.problems.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-danger-strong">{readiness.problems.map((p) => <li key={p.code}>{p.message}{p.count !== undefined ? ` (${p.count})` : ""}</li>)}</ul>}
          {readiness.warnings.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-warning">{readiness.warnings.map((p) => <li key={p.code}>{p.message}</li>)}</ul>}
        </Card>
      )}
      {diagnostics ? (
        <Card title="Payment system">
          <Facts items={[["Provider", `${diagnostics.provider.configured}${diagnostics.provider.simulated ? " (simulation)" : ""}`], ["Refund execution", diagnostics.provider.refundExecution], ["Payout execution", diagnostics.provider.payoutExecution], ["Collections pending", String(diagnostics.collections.pending)], ["Collections indeterminate", String(diagnostics.collections.indeterminate)], ["Open exceptions", String(diagnostics.exceptions.open)], ["Data integrity checks", diagnostics.integrity.ok ? "Passed" : "Violations found"]]} />
        </Card>
      ) : (
        <Empty>The payment diagnostics could not be read. Reload the page.</Empty>
      )}
      {attention && attention.pendingCollections.count > 0 && (
        <p className="rounded-xl border border-warning/30 bg-warning-light px-4 py-3 text-sm text-warning">
          {attention.pendingCollections.count} collection(s) are still pending at the provider ({attention.pendingCollections.overdue} past the one-business-day review target). {attention.pendingCollections.note}
        </p>
      )}
      <FilterChips label="Filter by state" current={query.resolved ? "resolved" : "open"} href={(value) => href({ resolved: value === "resolved" })} options={[{ value: "open", text: "Open" }, { value: "resolved", text: "Closed" }]} />
      {page.items.length === 0 ? (
        <Empty>{query.resolved ? "No closed issues." : "No open issues."}</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead>
              <tr className="bg-surface-alt text-[11px] font-semibold uppercase tracking-wider text-muted">
                <Th>Issue</Th>
                <Th>Detected</Th>
                <Th>Collection</Th>
                <Th>State</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {page.items.map((issue) => (
                <tr key={issue.id}>
                  <td className="px-4 py-3.5"><Link href={`${BASE}/${issue.id}`} className="font-semibold text-heading hover:text-primary">{humanize(issue.kind)}</Link>{issue.detail && <span className="block text-xs text-muted">{issue.detail}</span>}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-body">{dateTime(issue.detectedAt)}</td>
                  <td className="px-4 py-3.5 text-body">{issue.collectionStatus ? humanize(issue.collectionStatus) : "—"}</td>
                  <td className="px-4 py-3.5"><Pill tone={issue.resolvedAt ? "neutral" : "warn"}>{issue.resolution ? humanize(issue.resolution) : "Open"}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {page.nextCursor && <MoreLink href={href({ cursor: page.nextCursor })} />}
    </div>
  );
}

export async function IssueDetailPage({ id, permissions }: { id: string; permissions: readonly PermissionCode[] }) {
  const issue = await loadIssue(id);
  const may = permissions.includes("reconciliation.resolve");
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Back href="/admin/reconciliation">Back to reconciliation</Back>
      <AdminHeader title={humanize(issue.kind)} text={issue.detail ?? undefined} action={<Pill tone={issue.resolvedAt ? "neutral" : "warn"}>{issue.resolution ? humanize(issue.resolution) : "Open"}</Pill>} />
      <Card title="Issue">
        <Facts items={[["Detected", dateTime(issue.detectedAt)], ["Collection status", issue.collectionStatus ? humanize(issue.collectionStatus) : "—"], ["Closed", dateTime(issue.resolvedAt)], ["Closing note", issue.resolutionNote ?? "—"]]} />
        {issue.collectionStatus === "pending" && !issue.resolvedAt && <p className="mt-3 text-sm text-body">The collection is still pending at the provider. Pending collections never expire by age, and this issue stays open until trusted evidence settles it.</p>}
      </Card>
      <Card title="Resolve">{may ? <IssueDecision id={issue.id} canResolve={issue.canResolve} canDismiss={issue.canDismiss} /> : <p className="text-sm text-muted">Your role can see issues but not resolve them.</p>}</Card>
    </div>
  );
}

