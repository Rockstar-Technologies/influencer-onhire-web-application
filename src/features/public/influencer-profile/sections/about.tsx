import { Panel } from "@/components/shared/panel";

export function About({ firstName, bio }: { firstName: string; bio: string | null }) {
  return (
    <Panel title={`About ${firstName}`}>
      <p className="whitespace-pre-line text-sm leading-relaxed text-body">{bio ?? "This creator hasn't added a description yet."}</p>
    </Panel>
  );
}
