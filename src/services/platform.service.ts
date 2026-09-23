import type { PlatformStat } from "@/types/platform";
import { MOCK_PLATFORM_STATS } from "./mock/platform.mock";

export async function getPlatformStats(): Promise<PlatformStat[]> {
  // TODO: replace with `fetch("/api/platform/stats")` once the backend exists
  return MOCK_PLATFORM_STATS;
}
