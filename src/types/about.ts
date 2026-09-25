export interface AboutFact {
  value: string;
  label: string;
}

export interface AboutAudienceGuide {
  id: "brands" | "creators";
  eyebrow: string;
  title: string;
  steps: string[];
  cta: { label: string; href: string };
}

export interface AboutValue {
  id: string;
  title: string;
  description: string;
}

export interface AboutContent {
  intro: { eyebrow: string; title: string; highlight: string; body: string };
  facts: AboutFact[];
  story: { title: string; paragraphs: string[]; mission: string };
  guides: AboutAudienceGuide[];
  values: AboutValue[];
  closing: { title: string; body: string; primary: { label: string; href: string }; secondary: { label: string; href: string } };
}
