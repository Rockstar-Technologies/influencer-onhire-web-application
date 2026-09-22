export function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-surface-alt px-4 py-24 text-center">
      <span className="inline-flex items-center rounded-full bg-primary-light px-4 py-1.5 text-xs font-semibold text-primary">
        Cameroon&apos;s Trusted Influencer Marketplace
      </span>
      <h1 className="text-4xl font-extrabold text-heading sm:text-5xl">
        Influencers <span className="text-primary">On Hire</span>
      </h1>
      <p className="max-w-lg text-body">
        Find, hire, and pay the right influencers for your brand, product &amp; services.
      </p>
    </div>
  );
}
