import type {
  CreatorApplication,
  CreatorApplicationDraft,
  CreatorApplicationOptions,
  CreatorAudience,
  CreatorProfileBasics,
  CreatorRates,
  ForCreatorsContent,
} from "@/types/creator-application";
import {
  MOCK_CREATOR_APPLICATIONS,
  MOCK_CREATOR_APPLICATION_DRAFT,
  MOCK_CREATOR_APPLICATION_OPTIONS,
  MOCK_FOR_CREATORS_CONTENT,
} from "./mock/creator-application.mock";

export async function getForCreatorsContent(): Promise<ForCreatorsContent> {
  // TODO: replace with `return fetch("/api/content/for-creators").then(r => r.json())`
  return MOCK_FOR_CREATORS_CONTENT;
}

export async function getCreatorApplicationOptions(): Promise<CreatorApplicationOptions> {
  // TODO: replace with `return fetch("/api/creator-applications/options").then(r => r.json())`
  return MOCK_CREATOR_APPLICATION_OPTIONS;
}

export async function getCreatorApplicationDraft(): Promise<CreatorApplicationDraft> {
  // TODO: replace with `return fetch("/api/creator-applications/draft").then(r => r.json())`
  return { ...MOCK_CREATOR_APPLICATION_DRAFT };
}

export async function saveCreatorBasics(basics: CreatorProfileBasics): Promise<void> {
  // TODO: replace with `await fetch("/api/creator-applications/draft/basics", { method: "PUT", body: JSON.stringify(basics) })`
  MOCK_CREATOR_APPLICATION_DRAFT.basics = basics;
}

export async function saveCreatorAudience(audience: CreatorAudience): Promise<void> {
  // TODO: replace with `await fetch("/api/creator-applications/draft/audience", { method: "PUT", body: JSON.stringify(audience) })`
  MOCK_CREATOR_APPLICATION_DRAFT.audience = audience;
}

export async function saveCreatorRates(rates: CreatorRates): Promise<void> {
  // TODO: replace with `await fetch("/api/creator-applications/draft/rates", { method: "PUT", body: JSON.stringify(rates) })`
  MOCK_CREATOR_APPLICATION_DRAFT.rates = rates;
}

export async function submitCreatorApplication(rates: CreatorRates): Promise<CreatorApplication> {
  // TODO: replace with `return fetch("/api/creator-applications", { method: "POST", body: JSON.stringify(rates) }).then(r => r.json())`
  const { basics, audience } = MOCK_CREATOR_APPLICATION_DRAFT;
  if (!basics || !audience) throw new Error("Earlier steps are incomplete");

  const application: CreatorApplication = {
    id: `APP-${Date.now().toString(36).toUpperCase()}`,
    status: "under_review",
    submittedAt: new Date().toISOString(),
    basics,
    audience,
    rates,
  };
  MOCK_CREATOR_APPLICATIONS.push(application);
  delete MOCK_CREATOR_APPLICATION_DRAFT.basics;
  delete MOCK_CREATOR_APPLICATION_DRAFT.audience;
  delete MOCK_CREATOR_APPLICATION_DRAFT.rates;
  return application;
}

export async function getCreatorApplication(id: string): Promise<CreatorApplication | null> {
  // TODO: replace with `return fetch(`/api/creator-applications/${id}`).then(r => (r.ok ? r.json() : null))`
  return MOCK_CREATOR_APPLICATIONS.find((application) => application.id === id) ?? null;
}
