import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

export function CampaignHeader() {
  return (
    <div>
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover">
        <FiArrowLeft />
        Back to Home
      </Link>
      <div className="mx-auto mt-6 max-w-2xl text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-primary">For Brands</span>
        <h1 className="mt-3 text-3xl font-bold text-heading sm:text-4xl">Campaign Details</h1>
        <p className="mt-4 text-body">
          Tell us what you need. Required fields are marked <span className="font-semibold text-danger">*</span> and get
          a green check as you complete them. &ldquo;Refine Your Reach&rdquo; is optional and can be skipped.
        </p>
      </div>
    </div>
  );
}
