import type { ForBrandsContent } from "@/types/brand";

export function BrandStats({ stats }: { stats: ForBrandsContent["stats"] }) {
  return (
    <section className="border-b border-border bg-surface px-4 py-10 sm:px-6 lg:px-8">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-6 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col-reverse items-center text-center">
            <dt className="mt-1 text-sm font-medium text-muted">{stat.label}</dt>
            <dd className="text-3xl font-extrabold text-primary sm:text-4xl">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
