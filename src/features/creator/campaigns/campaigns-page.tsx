import Link from "next/link";
import { OfferStatusBadge } from "@/features/offers/offer-status";
import { formatDate, formatFcfa } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BUDGETS, SORTS, SORT_LABELS, campaignsHref } from "./query";
import type { CampaignQuery } from "./query";
import { loadCampaigns, loadFilters } from "./server";

/** Open campaigns the creator can apply to, from the API. The budget shown is the MAXIMUM the brand pays each creator. */
export async function CampaignsBrowsePage({ query }: { query: CampaignQuery }) {
  const [page, filters] = await Promise.all([loadCampaigns(query), loadFilters()]);
  const href = (change: Partial<CampaignQuery>) => campaignsHref({ ...query, cursor: undefined, ...change } as CampaignQuery);
  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-heading sm:text-3xl">Open campaigns</h1>
        <p className="mt-2 max-w-3xl text-sm text-body">Campaigns brands have opened to creators. Apply with one of your platforms and your price; the brand decides. Niche and city are filters, not rules: you can apply to any campaign you are eligible for.</p>
      </div>

      <form action="/creator/campaigns" role="search" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="min-w-0 flex-1">
          <label htmlFor="campaign-q" className="text-xs font-semibold uppercase tracking-wide text-muted">
            Campaign title
          </label>
          <input id="campaign-q" name="q" defaultValue={query.q} minLength={2} maxLength={100} className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-heading outline-none focus:border-primary" />
        </div>
        {query.niche.map((v) => <input key={`n-${v}`} type="hidden" name="niche" value={v} />)}
        {query.city.map((v) => <input key={`c-${v}`} type="hidden" name="city" value={v} />)}
        {query.budget && <input type="hidden" name="budget" value={query.budget} />}
        {query.eligibleOnly && <input type="hidden" name="eligible" value="true" />}
        {query.sort !== "newest" && <input type="hidden" name="sort" value={query.sort} />}
        <button type="submit" className="h-10 rounded-lg bg-navy px-5 text-sm font-semibold text-white hover:bg-navy-hover">
          Search
        </button>
      </form>

      <div className="space-y-3">
        <Chips label="Niche" items={filters.niches.map((n) => ({ key: n.slug, text: n.name, on: query.niche.includes(n.slug), to: href({ niche: toggle(query.niche, n.slug) }) }))} />
        <Chips label="City" items={filters.cities.map((c) => ({ key: c.slug, text: c.name, on: query.city.includes(c.slug), to: href({ city: toggle(query.city, c.slug) }) }))} />
        <Chips label="Budget per creator" items={Object.entries(BUDGETS).map(([key, b]) => ({ key, text: b.label, on: query.budget === key, to: href({ budget: query.budget === key ? "" : key }) }))} />
        <Chips label="Eligibility" items={[{ key: "eligible", text: "Only campaigns I can apply to", on: query.eligibleOnly, to: href({ eligibleOnly: !query.eligibleOnly }) }]} />
        <Chips label="Sort" items={SORTS.map((s) => ({ key: s, text: SORT_LABELS[s], on: query.sort === s, to: href({ sort: s }) }))} />
      </div>

      {page.items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center text-sm text-body">
          {query.cursor ? "That was the last page." : "No open campaigns match. Try removing a filter."}
          {(query.cursor || query.q || query.niche.length > 0 || query.city.length > 0 || query.budget || query.eligibleOnly) && (
            <div className="mt-4">
              <Link href="/creator/campaigns" className="font-semibold text-primary">
                Clear filters
              </Link>
            </div>
          )}
        </div>
      ) : (
        <ul className="space-y-4">
          {page.items.map((campaign) => (
            <li key={campaign.id} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/creator/campaigns/${campaign.id}`} className="text-base font-bold text-heading hover:text-primary">
                    {campaign.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted">
                    {campaign.reference} · {campaign.brand.name} · {campaign.niche.name}
                    {campaign.cities.length > 0 ? ` · ${campaign.cities.map((c) => c.name).join(", ")}` : ""}
                  </p>
                </div>
                {campaign.myOffer ? <OfferStatusBadge status={campaign.myOffer.status} /> : !campaign.eligibility.canApply ? <span className="rounded-full bg-border-light px-2.5 py-0.5 text-xs font-semibold text-body">Not eligible</span> : null}
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted">Maximum per creator</dt>
                  <dd className="font-semibold tabular-nums text-heading">{formatFcfa(campaign.budgetXaf)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Dates</dt>
                  <dd className="text-heading">
                    {formatDate(campaign.startDate)} → {formatDate(campaign.endDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Minimum engagement</dt>
                  <dd className="text-heading">{campaign.minEngagement?.label ?? "None"}</dd>
                </div>
              </dl>
              <Link href={`/creator/campaigns/${campaign.id}`} className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                {campaign.myOffer ? "View my application" : "View and apply"}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {page.nextCursor && (
        <div className="text-center">
          <Link href={campaignsHref({ ...query, cursor: page.nextCursor })} className="inline-flex rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-heading hover:bg-surface-alt">
            Show more
          </Link>
        </div>
      )}
    </div>
  );
}

function Chips({ label, items }: { label: string; items: { key: string; text: string; on: boolean; to: string }[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-muted">{label}</span>
      {items.map((item) => (
        <Link key={item.key} href={item.to} aria-current={item.on ? "page" : undefined} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors", item.on ? "border-navy bg-navy text-white" : "border-border bg-surface text-body hover:border-primary-border hover:text-primary")}>
          {item.text}
        </Link>
      ))}
    </nav>
  );
}
