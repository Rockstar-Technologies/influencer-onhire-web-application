import { Panel } from "@/components/shared/panel";

export function About({ firstName, bio }: { firstName: string; bio: string }) {
  return (
    <Panel title={`About ${firstName}`}>
      <p className="text-sm leading-relaxed text-body">{bio}</p>
    </Panel>
  );
}
