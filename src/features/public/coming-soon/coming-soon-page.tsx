import Link from "next/link";

interface ComingSoonPageProps {
  title?: string;
}

export function ComingSoonPage({ title = "This page" }: ComingSoonPageProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-surface-alt px-4 py-24 text-center">
      <span className="mb-6 inline-flex items-center rounded-full bg-primary-light px-4 py-1.5 text-xs font-semibold text-primary">
        Under Development
      </span>
      <h1 className="max-w-xl text-3xl font-bold text-heading sm:text-4xl">
        {title} isn&apos;t available yet
      </h1>
      <p className="mt-4 max-w-md text-body">
        We&apos;re still building this part of Influencer On Hire. Check back soon — it&apos;s coming shortly.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
      >
        Back to Home
      </Link>
    </div>
  );
}
