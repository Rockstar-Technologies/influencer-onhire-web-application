import type { AboutContent } from "@/types/about";
import { MOCK_ABOUT_CONTENT } from "./mock/about.mock";

export async function getAboutContent(): Promise<AboutContent> {
  // TODO: replace with `return fetch("/api/content/about").then(r => r.json())`
  return MOCK_ABOUT_CONTENT;
}
