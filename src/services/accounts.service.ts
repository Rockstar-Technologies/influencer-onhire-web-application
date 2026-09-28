import type { BrandAccount } from "@/types/account";
import { MOCK_CURRENT_BRAND } from "./mock/accounts.mock";

export async function getCurrentBrandAccount(): Promise<BrandAccount> {
  // TODO: replace with `return fetch("/api/me/brand").then(r => r.json())`
  return MOCK_CURRENT_BRAND;
}
