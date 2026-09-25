import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
}

export function SectionHeading({ eyebrow, title, description, className }: SectionHeadingProps) {
  return (
    <div className={cn("mx-auto flex max-w-2xl flex-col items-center text-center", className)}>
      <span className="text-xs font-bold uppercase tracking-widest text-primary">{eyebrow}</span>
      <h2 className="mt-3 text-3xl font-bold text-heading sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-body">{description}</p>}
    </div>
  );
}
