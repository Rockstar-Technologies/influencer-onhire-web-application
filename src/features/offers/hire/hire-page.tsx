import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { loadHireCreator } from "../server";
import { HireForm } from "./hire-form";
import { CreatorSummary } from "./creator-summary";

/** The direct-hire form for a real creator, loaded with the signed-in brand's session. The page route has already required a signed-in brand. */
export async function HirePage({ username }: { username: string }) {
  const creator = await loadHireCreator(username, `/influencers/${encodeURIComponent(username)}/hire`);
  const firstName = creator.displayName.split(" ")[0] ?? creator.displayName;

  return (
    <div className="bg-surface px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/influencers" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover">
          <FiArrowLeft />
          Back to influencers
        </Link>
        <div className="mx-auto mt-6 max-w-xl">
          <HireForm creator={creator} firstName={firstName} header={<CreatorSummary creator={creator} />} />
        </div>
      </div>
    </div>
  );
}
