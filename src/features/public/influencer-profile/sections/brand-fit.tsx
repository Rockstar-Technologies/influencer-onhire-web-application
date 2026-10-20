import { Panel } from "@/components/shared/panel";

export function BrandFit({ brandFit }: { brandFit: string[] }) {
  if (brandFit.length === 0) return null;
  return (
    <Panel title="Brand Fit">
      <ul className="flex flex-wrap gap-2">
        {brandFit.map((item) => (
          <li key={item} className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
