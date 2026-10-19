import type { EscrowStep } from "@/types/payment";
import { MOCK_ESCROW_STEPS } from "./mock/campaign-payments.mock";

/** Static marketing copy for the public "for brands" page (not account data). */
export async function listEscrowSteps(): Promise<EscrowStep[]> {
  return MOCK_ESCROW_STEPS;
}
