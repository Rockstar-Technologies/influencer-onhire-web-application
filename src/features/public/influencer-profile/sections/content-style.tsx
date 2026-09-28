import { Panel } from "@/components/shared/panel";

export function ContentStyle({ contentStyle }: { contentStyle: string }) {
  return (
    <Panel title="Content Style">
      <p className="text-sm leading-relaxed text-body">{contentStyle}</p>
    </Panel>
  );
}
