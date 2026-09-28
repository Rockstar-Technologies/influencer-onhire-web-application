import { Button } from "@/components/shared/button";
import { EscrowSteps } from "@/components/shared/escrow-steps";
import type { EscrowStep } from "@/types/payment";

export function BrandEscrow({ steps }: { steps: EscrowStep[] }) {
  return (
    <section className="bg-surface-alt px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Payments &amp; Escrow</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-heading sm:text-4xl">
              Your money is safe until the work is done
            </h2>
            <p className="mt-3 text-body">
              Fund campaigns with MTN MoMo or Orange Money. We hold the payment and only release it once the creator
              delivers.
            </p>
          </div>
          <Button href="/brand/payments" variant="outline" className="shrink-0 hover:border-primary-border hover:text-primary">
            Open Payments Dashboard
          </Button>
        </div>
        <div className="mt-10">
          <EscrowSteps steps={steps} />
        </div>
      </div>
    </section>
  );
}
