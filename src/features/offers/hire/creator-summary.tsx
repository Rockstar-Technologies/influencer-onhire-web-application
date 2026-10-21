import type { HireCreator } from "@/lib/api/schemas";
import { formatFcfa } from "@/lib/format";
import { initials } from "@/lib/utils";

/** Who is being hired, from the API. There is no photo yet (media delivery does not exist), so the initials stand in. */
export function CreatorSummary({ creator }: { creator: HireCreator }) {
  return (
    <div className="flex items-center gap-4">
      <span aria-hidden className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-info-light text-xl font-bold text-navy">
        {initials(creator.displayName)}
      </span>
      <div className="min-w-0">
        <h1 className="text-lg font-bold text-heading">
          <span className="sr-only">Hire </span>
          {creator.displayName}
        </h1>
        <p className="mt-0.5 text-sm text-muted">
          {creator.primaryNiche} · {creator.city.name}
        </p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-body">
          {creator.platforms.map((platform) => (
            <li key={platform.platform}>
              {platform.name} {platform.handle} · {platform.followers.toLocaleString("en-US")} followers · {formatFcfa(platform.priceXaf)}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">Min. booking {creator.minimumBooking.label}</p>
      </div>
    </div>
  );
}
