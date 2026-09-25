import type { AboutContent } from "@/types/about";

export function OurStory({ story }: Pick<AboutContent, "story">) {
  return (
    <section className="bg-surface px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <div>
          <h2 className="text-3xl font-bold text-heading sm:text-4xl">{story.title}</h2>
          <div className="mt-6 flex flex-col gap-4 text-body">
            {story.paragraphs.map((paragraph) => (
              <p key={paragraph} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <blockquote className="self-center rounded-2xl bg-primary-light p-8 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Our mission</p>
          <p className="mt-4 text-xl font-semibold leading-relaxed text-heading sm:text-2xl">{story.mission}</p>
        </blockquote>
      </div>
    </section>
  );
}
