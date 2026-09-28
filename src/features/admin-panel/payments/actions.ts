"use server";

import { revalidatePath } from "next/cache";
import { formatPrice } from "@/lib/utils";
import { releasePayment, splitPayment } from "@/services/payments.service";
import type { ActionResult } from "@/types/user-management";

// Server Actions are reachable by direct POST, so the id is validated here.
// TODO: once auth exists, allow this only for Super Admin and Finance roles.
export async function releasePaymentAction(id: string): Promise<ActionResult> {
  if (typeof id !== "string" || id.length > 40) return { ok: false, message: "Invalid request." };

  const payment = await releasePayment(id);
  if (!payment) return { ok: false, message: "This payment isn't waiting for release any more. Refresh to see its current status." };

  revalidatePath("/admin", "layout");
  const { net, fee } = splitPayment(payment.gross);
  return {
    ok: true,
    message: `Released ${formatPrice(net)} to ${payment.creator.name}. ${formatPrice(fee)} booked as platform revenue.`,
  };
}
