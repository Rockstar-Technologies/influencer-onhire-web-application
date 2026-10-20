/**
 * Support tickets are not available: the API has no support route (the `support_tickets` table and the `tickets.manage` permission exist, but no ticket can be
 * opened, listed, answered or assigned), and the ticket flow is not decided. This page therefore shows no tickets, no counts and no form: nothing here is sample
 * data and nothing can be "saved". See docs/FRONTEND_INTEGRATION_PLAN.md section 24.
 */
export function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-heading sm:text-3xl">Support &amp; Communication</h1>
        <p className="mt-2 text-sm text-body">Tickets from influencers and brands.</p>
      </div>
      <section role="status" aria-labelledby="support-unavailable" className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 id="support-unavailable" className="font-display text-base font-bold text-heading">
          Support tickets are not available yet
        </h2>
        <p className="mt-2 text-sm text-body">
          The platform has no support service yet, so there are no tickets to show and none can be opened, answered or assigned here. Nothing on this page is
          sample data. Until the service exists, support requests cannot be tracked in this application.
        </p>
        <p className="mt-3 text-xs text-muted">Waiting on: the support ticket flow and categories to be decided, and the service to be built.</p>
      </section>
    </div>
  );
}
