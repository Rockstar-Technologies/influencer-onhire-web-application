import { Panel } from "@/components/shared/panel";

export function ContentStyle({ contentStyle }: { contentStyle: string | null }) {
  if (!contentStyle) return null; // optional: nothing is shown rather than a placeholder
  return (
    <Panel title="Content Style">
      <p className="text-sm leading-relaxed text-body">{contentStyle}</p>
    </Panel>
  );
}
