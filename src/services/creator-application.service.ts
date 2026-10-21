import type { ForCreatorsContent } from "@/types/creator-application";
import { MOCK_FOR_CREATORS_CONTENT } from "./mock/creator-application.mock";

// Static marketing copy for /for-creators. The application wizard itself no longer uses this file: it talks to the API through
// src/features/creator-application (server-side).
export async function getForCreatorsContent(): Promise<ForCreatorsContent> {
  // TODO: replace with `return fetch("/api/content/for-creators").then(r => r.json())`
  return MOCK_FOR_CREATORS_CONTENT;
}
