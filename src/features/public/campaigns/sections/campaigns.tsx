import { Button } from "@/components/shared/button";
import { cn } from "@/lib/utils";
import { getCampaignOverview, getCampaignPreview } from "@/services/campaigns.service";
import type { CampaignPreview } from "@/types/campaign";

const PHOTO_TONES = ["bg-primary/15", "bg-primary/30", "bg-primary/20", "bg-primary/40", "bg-primary/10", "bg-primary/25"];

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

// Stand-in for a creator photo until real media exists.
function PhotoPlaceholder({ tone, className }: { tone: string; className?: string }) {
  return (
    <div className={cn("relative flex items-end justify-center overflow-hidden", tone, className)}>
      <svg viewBox="0 0 40 40" className="h-3/4 w-3/4 text-primary/60" fill="currentColor">
        <circle cx="20" cy="14" r="7" />
        <path d="M6 40c0-9 6-15 14-15s14 6 14 15z" />
      </svg>
    </div>
  );
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("h-1.5 rounded-full bg-border-light", className)} />;
}

function CampaignMockup({ preview }: { preview: CampaignPreview }) {
  const { creators, featured } = preview;

  return (
    <div aria-hidden className="relative mx-auto aspect-[5/4] w-full max-w-xl select-none">
      {/* Back card: browse grid */}
      <div className="absolute left-0 top-[4%] w-[80%] overflow-hidden rounded-lg border border-border bg-surface p-[2%] shadow-lg">
        <div className="mx-auto mb-[3%] flex w-[75%] items-center rounded-full border border-border px-3 py-1.5 shadow-sm">
          {["Platform", "Category", "Followers"].map((label, index) => (
            <div key={label} className={cn("flex-1 leading-tight", index > 0 && "border-l border-border pl-2")}>
              <p className="text-[7px] font-semibold text-heading">{label}</p>
              <p className="text-[6px] text-muted">All</p>
            </div>
          ))}
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
            <SearchIcon />
          </span>
        </div>

        <div className="grid grid-cols-6 gap-[2%]">
          {creators.slice(0, 6).map((creator, index) => (
            <div key={creator.id}>
              <PhotoPlaceholder tone={PHOTO_TONES[index % PHOTO_TONES.length]} className="aspect-[3/4] rounded" />
              <div className="mt-1 flex justify-between text-[6px]">
                <span className="text-muted">{creator.platform}</span>
                <span className="font-semibold text-heading">${creator.price}</span>
              </div>
              <SkeletonLine className="mt-1" />
            </div>
          ))}
          {creators.slice(6).map((creator, index) => (
            <PhotoPlaceholder
              key={creator.id}
              tone={PHOTO_TONES[(index + 3) % PHOTO_TONES.length]}
              className="mt-[6%] aspect-[3/4] rounded"
            />
          ))}
        </div>
      </div>

      {/* Front card: creator profile */}
      <div className="absolute bottom-[4%] right-0 w-[70%] overflow-hidden rounded-lg border border-border bg-surface shadow-2xl">
        <div className="grid grid-cols-[1.4fr_1fr] gap-0.5">
          <PhotoPlaceholder tone="bg-heading/80" className="row-span-2 h-full min-h-24" />
          <div className="grid grid-cols-2 gap-0.5">
            <PhotoPlaceholder tone="bg-primary/20" className="aspect-square" />
            <PhotoPlaceholder tone="bg-primary/35" className="aspect-square" />
          </div>
          <PhotoPlaceholder tone="bg-primary/15" className="aspect-[2/1]" />
        </div>

        <div className="grid grid-cols-[1.4fr_1fr] gap-2 p-2">
          <div>
            <p className="text-[7px] font-semibold text-heading">{featured.niches.join(", ")}</p>
            <SkeletonLine className="mt-1.5 w-full" />
            <SkeletonLine className="mt-1 w-11/12" />
            <SkeletonLine className="mt-1 w-4/5" />

            <p className="mt-3 text-[7px] font-semibold text-heading">Packages</p>
            {featured.packages.map((pkg) => (
              <div key={pkg.name} className="mt-1 rounded border border-border border-l-2 border-l-primary p-1.5 shadow-sm">
                <div className="flex items-center justify-between text-[6px]">
                  <span className="font-medium text-heading">{pkg.name}</span>
                  <span className="font-semibold text-heading">${pkg.price}</span>
                </div>
                <SkeletonLine className="mt-1 w-3/5" />
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center">
            <PhotoPlaceholder tone="bg-primary-light" className="h-7 w-7 rounded-full border border-primary-border" />
            <p className="mt-1 flex items-center gap-0.5 text-[6px] font-semibold text-primary">
              {featured.name}
              <span className="h-1 w-1 rounded-full bg-primary" />
            </p>
            <SkeletonLine className="mt-1.5 w-full" />
            <SkeletonLine className="mt-1 w-3/4" />
            <div className="mt-2 w-full rounded border border-border p-1.5">
              <p className="text-[6px] font-medium text-heading">{featured.niches.join(", ")}</p>
              <SkeletonLine className="mt-1 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function Campaigns() {
  const [overview, preview] = await Promise.all([getCampaignOverview(), getCampaignPreview()]);

  return (
    <section className="bg-surface py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-3xl font-bold text-heading sm:text-4xl">Campaigns</h2>
          <Button href="/campaigns/new">
            <PlusIcon />
            Post a Campaign
          </Button>
        </div>

        <div className="mt-10 grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <CampaignMockup preview={preview} />

          <div>
            <h3 className="text-3xl font-bold leading-tight text-heading sm:text-4xl">
              Post Campaigns and Have{" "}
              <span className="text-primary">{overview.influencerReach} Influencers</span> Come to You
            </h3>

            <ol className="mt-10 space-y-8">
              {overview.steps.map((step, index) => (
                <li key={step.id} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="text-xl font-semibold text-heading">{step.title}</h4>
                    <p className="mt-2 leading-relaxed text-body">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
