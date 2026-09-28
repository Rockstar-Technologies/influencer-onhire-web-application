import type { ForBrandsContent } from "@/types/brand";
import { MOCK_FOR_BRANDS_CONTENT } from "./mock/brands.mock";

export async function getForBrandsContent(): Promise<ForBrandsContent> {
  // TODO: replace with `return fetch("/api/content/for-brands").then(r => r.json())`
  return MOCK_FOR_BRANDS_CONTENT;
}
