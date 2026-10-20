import { readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SRC = path.join(ROOT, "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const FILES = walk(SRC).map((file) => ({ file, rel: path.relative(ROOT, file), text: readFileSync(file, "utf8") }));
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const isClientComponent = (text: string) => /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(text);
const importsOf = (text: string) => [...text.matchAll(/(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/g)].map((m) => m[1] as string);

/** Modules that hold the API client, config, session or authorization logic and must never reach the browser. */
const SERVER_ONLY_MODULES = [
  "src/lib/api/client.ts",
  "src/lib/api/config.ts",
  "src/lib/auth/session.ts",
  "src/lib/auth/action-access.ts",
];

describe("server-only boundary", () => {
  it("the real `server-only` package throws when imported outside a server build", () => {
    const require = createRequire(import.meta.url);
    expect(() => require("server-only")).toThrow(/Client Component/);
  });

  it.each(SERVER_ONLY_MODULES)("%s imports server-only", (rel) => {
    expect(readFileSync(path.join(ROOT, rel), "utf8")).toMatch(/^import "server-only";/m);
  });

  it("no client component imports a server-only module (directly)", () => {
    const forbidden = SERVER_ONLY_MODULES.map((rel) => rel.replace(/^src\//, "@/").replace(/\.ts$/, ""));
    const offenders = FILES.filter((f) => isClientComponent(f.text)).flatMap((f) =>
      importsOf(f.text).filter((spec) => forbidden.includes(spec) || spec.startsWith("@/lib/api/client") || spec.startsWith("@/lib/api/config")).map((spec) => `${f.rel} -> ${spec}`),
    );
    expect(offenders).toEqual([]);
  });

  it("no client component imports a module that (transitively) imports a server-only module, other than Server Actions", () => {
    // Server Actions files ("use server") are the sanctioned bridge; everything else that imports server-only code is itself server code.
    const serverCode = new Set(FILES.filter((f) => /import "server-only"/.test(f.text) || /^\s*["']use server["']/m.test(f.text)).map((f) => f.rel));
    const resolveImport = (from: string, spec: string) => {
      const base = spec.startsWith("@/") ? path.join(SRC, spec.slice(2)) : path.resolve(path.dirname(path.join(ROOT, from)), spec);
      return FILES.find((f) => [".ts", ".tsx", "/index.ts", "/index.tsx"].some((ext) => f.file === base + ext))?.rel;
    };
    const dependsOnServerOnly = new Map<string, boolean>();
    const visit = (rel: string, seen: Set<string>): boolean => {
      if (dependsOnServerOnly.has(rel)) return dependsOnServerOnly.get(rel) as boolean;
      if (seen.has(rel)) return false;
      seen.add(rel);
      const file = FILES.find((f) => f.rel === rel);
      if (!file) return false;
      if (/import "server-only"/.test(file.text)) return true;
      if (/^\s*["']use server["']/m.test(file.text)) return false; // Server Actions are callable from the client by design
      const result = importsOf(file.text).some((spec) => {
        const target = resolveImport(rel, spec);
        return target ? visit(target, seen) : false;
      });
      dependsOnServerOnly.set(rel, result);
      return result;
    };
    const offenders = FILES.filter((f) => isClientComponent(f.text) && !serverCode.has(f.rel)).filter((f) => visit(f.rel, new Set())).map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it("only the API client module uses fetch, so browser code cannot reach the Express API", () => {
    const withFetch = FILES.filter((f) => /(?<![-\w])fetch(?![-\w])/.test(f.text.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, ""))).map((f) => f.rel);
    expect(withFetch).toEqual(["src/lib/api/client.ts"]);
  });

  it("the API location is never exposed through NEXT_PUBLIC_ variables", () => {
    for (const f of FILES) expect(f.text, f.rel).not.toMatch(/NEXT_PUBLIC_[A-Z_]*API/);
    const nextConfig = readFileSync(path.join(ROOT, "next.config.ts"), "utf8");
    expect(nextConfig).not.toMatch(/API_BASE_URL|NEXT_PUBLIC/);
  });
});

describe("no leftover demo authentication or browser-side session storage", () => {
  it("the demo account cookie and picker are gone", () => {
    for (const f of FILES) {
      expect(f.text, f.rel).not.toContain("ioh_demo_account");
      expect(f.text, f.rel).not.toMatch(/\bsignInAction\b[^]*accountId/);
      expect(f.text, f.rel).not.toMatch(/listActiveAccounts\("(?:brand|influencer)"\)[^]*startSession/);
    }
    expect(FILES.some((f) => f.rel === "src/services/session.service.ts")).toBe(false);
    expect(FILES.some((f) => f.rel.startsWith("src/features/account/sign-in/"))).toBe(false);
    expect(FILES.some((f) => f.rel === "src/services/auth.service.ts" || f.rel === "src/services/mock/auth.mock.ts")).toBe(false);
  });

  it("nothing stores session or credential data in browser storage or document.cookie", () => {
    for (const f of FILES) {
      expect(f.text, f.rel).not.toMatch(/(?:local|session)Storage\s*\.\s*(?:set|get)Item\([^)]*(?:session|token|password|ioh_)/i);
      expect(f.text, f.rel).not.toMatch(/document\.cookie\s*=/);
    }
  });

  it("the session cookie is only written by the auth actions, with the shared HttpOnly options", () => {
    const writers = FILES.filter((f) => /cookies\(\)\)\.set\(/.test(f.text)).map((f) => f.rel);
    expect(writers).toEqual(["src/features/auth/actions.ts"]);
    expect(readFileSync(path.join(SRC, "features/auth/actions.ts"), "utf8")).toContain("browserCookieOptions(");
  });
});

describe("custom Route Handlers", () => {
  const routes = FILES.filter((f) => /\/route\.ts$/.test(f.rel));

  it("every state-changing Route Handler either refuses the method or verifies the request origin", () => {
    for (const f of routes) {
      const mutators = [...f.text.matchAll(/export\s+(?:async\s+function|const)\s+(POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1] as string);
      for (const method of mutators) {
        const refused = new RegExp(`export const ${method} = refuse`).test(f.text);
        const verified = /verifyRequestOrigin\(/.test(f.text);
        expect(refused || verified, `${f.rel} ${method}`).toBe(true);
      }
    }
  });

  it("Route Handlers never change state on GET", () => {
    for (const f of routes) {
      const getBody = f.text.slice(f.text.search(/export\s+async\s+function\s+GET/));
      expect(getBody, f.rel).not.toMatch(/cookies\(\)\)\.(?:set|delete)|\.insert\(|\.update\(|\.delete\(/);
    }
  });
});

describe("financial wording", () => {
  it("no unsupported withdrawal fee or timing promise remains", () => {
    for (const f of FILES) {
      if (f.rel.endsWith("user-management.mock.ts")) continue; // unrelated mock alert text about payout-account changes
      expect(f.text, f.rel).not.toMatch(/Withdrawals are free/i);
      expect(f.text, f.rel).not.toMatch(/usually (?:arrive|credited)/i);
      expect(f.text, f.rel).not.toMatch(/within 24 hours/i);
      expect(f.text, f.rel).not.toMatch(/(?:is|are) on its way to your mobile money/i);
    }
  });

  it("the approved replacement wording is used on both withdrawal screens", () => {
    const wording = "Withdrawal requests are subject to review. Any applicable fees and estimated processing times will be shown when confirmed.";
    for (const rel of ["src/features/account/creator-payments/sections/withdraw-dialog.tsx", "src/features/creator/earnings/sections/withdraw-panel.tsx"]) {
      expect(readFileSync(path.join(ROOT, rel), "utf8")).toContain(wording);
    }
  });
});

describe("one vocabulary: legacy spellings are gone from the source", () => {
  // The only place allowed to mention the old spellings is the boundary mapper that translates saved links and display text.
  const SOURCE = FILES.filter((f) => !["src/lib/domain/mappers.ts", "src/lib/domain/labels.ts"].includes(f.rel));

  const LEGACY: [string, RegExp][] = [
    ["influencer as an account type or role", /(?:type|role|fromRole|requester)\s*(?:===|!==|:|=)\s*["']influencer["']|\[\s*["']influencer["']\s*,|\(\s*["']influencer["']\s*\)/],
    ["old payment statuses", /["'](?:on_hold|payout_requested)["']/],
    ["kebab-case API statuses", /["'](?:in-progress|in-review|pending-review|resolved-in-favour|resolved-against)["']/],
    ["kebab-case document, alert and flag codes", /["'](?:tax-id|business-registration|national-id|failed-logins|follower-spike|payout-change|campaign-description)["']/],
    ["payment method display label used as a value", /method\s*[:=]\s*["'](?:MTN MoMo|Orange Money)["']/],
    ["display age range used as a value", /value:\s*["']45\+["']/],
    ["team role display label used as a value", /role\s*[:=]\s*["'](?:Super Admin|Campaign Manager|Finance|Support Agent)["']/],
  ];

  it.each(LEGACY)("no %s", (_name, pattern) => {
    const offenders = SOURCE.filter((f) => pattern.test(stripComments(f.text))).map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it("the duplicate payment status and method type definitions both point at the canonical vocabulary", () => {
    for (const rel of ["src/types/payment.ts", "src/types/payments.ts"]) {
      const text = readFileSync(path.join(ROOT, rel), "utf8");
      expect(text, rel).toContain("@/lib/domain/vocabulary");
      expect(text, rel).not.toMatch(/export type EscrowStatus\s*=\s*["']/);
    }
  });
});

describe("the creator application wizard is no longer backed by mock services", () => {
  const WIZARD = FILES.filter((f) => f.rel.startsWith("src/features/public/creator-apply/") || f.rel.startsWith("src/features/creator-application/"));

  it("the wizard files import neither the application mock nor the old service functions", () => {
    expect(WIZARD.length).toBeGreaterThan(8);
    for (const f of WIZARD) {
      expect(f.text, f.rel).not.toMatch(/creator-application\.mock|services\/creator-application\.service/);
      expect(f.text, f.rel).not.toMatch(/getCreatorApplication(?:Draft|Options)?\b|saveCreator(?:Basics|Audience|Rates)|submitCreatorApplication/);
    }
  });

  it("the old mock data and service functions are gone (only the static For-creators content remains)", () => {
    const service = FILES.find((f) => f.rel === "src/services/creator-application.service.ts")!;
    expect(service.text).not.toMatch(/MOCK_CREATOR_APPLICATION|export async function (?:save|submit|getCreatorApplication)/);
    const mock = FILES.find((f) => f.rel === "src/services/mock/creator-application.mock.ts")!;
    expect(mock.text).not.toMatch(/MOCK_CREATOR_APPLICATION/);
    expect(mock.text).not.toMatch(/contacts you on the mobile number/);
  });

  it("no wizard code sends a photo as data: there is no data URL, FileReader or file input", () => {
    for (const f of WIZARD) {
      const code = stripComments(f.text).replace(/Photo upload isn.t available yet[\s\S]*?later[^<]*/, "");
      expect(code, f.rel).not.toMatch(/photoDataUrl|FileReader|readAsDataURL|type="file"|data:image/);
    }
  });

  it("wizard browser code never calls the API itself: it only calls the wizard Server Actions", () => {
    for (const f of WIZARD.filter((file) => isClientComponent(file.text))) {
      expect(f.text, f.rel).not.toMatch(/callApi|callWithSession|from "@\/lib\/api\/(?:client|config)"/);
    }
  });

  it("every wizard Server Action checks the session first (authorizeAction) and no action accepts an identifier", () => {
    const actions = FILES.find((f) => f.rel === "src/features/creator-application/actions.ts")!;
    expect(actions.text).toContain("authorizeAction");
    expect(actions.text).not.toMatch(/creatorId|userId|applicationId/);
    for (const name of ["saveProfileAction", "saveAudienceAction", "saveRatesAction", "submitApplicationAction", "reapplyAction"]) {
      expect(actions.text).toContain(`export async function ${name}`);
    }
  });
});

describe("brand campaigns are no longer backed by mock services", () => {
  const CAMPAIGN_FILES = FILES.filter((f) => f.rel.startsWith("src/features/brand-campaigns/") || f.rel.startsWith("src/features/brand/campaigns/"));

  it("the legacy mock campaign flows and services are gone", () => {
    for (const gone of ["src/features/public/direct-campaign", "src/features/public/post-campaign", "src/features/public/campaign-preview", "src/features/public/campaign-posted", "src/services/direct-campaigns.service.ts", "src/services/mock/direct-campaigns.mock.ts", "src/types/direct-campaign.ts"]) {
      expect(FILES.some((f) => f.rel === gone || f.rel.startsWith(`${gone}/`)), gone).toBe(false);
    }
  });

  it("campaign code imports no mock or service module", () => {
    expect(CAMPAIGN_FILES.length).toBeGreaterThan(5);
    for (const f of CAMPAIGN_FILES) expect(importsOf(f.text).filter((i) => /\/services\/|\/mock\//.test(i)), f.rel).toEqual([]);
  });

  it("campaign browser code never calls the API itself; only Server Actions do", () => {
    for (const f of CAMPAIGN_FILES.filter((file) => isClientComponent(file.text))) {
      expect(f.text, f.rel).not.toMatch(/callApi|callWithSession|from "@\/lib\/api\/(?:client|config)"|\bfetch\(/);
    }
  });

  it("every campaign Server Action checks the session and role first, and accepts no owner, status or reviewer field", () => {
    const actions = FILES.find((f) => f.rel === "src/features/brand-campaigns/actions.ts")!;
    expect(actions.text).toContain('const BRAND_ONLY = { role: "brand" }');
    expect(actions.text).toContain("authorizeAction(BRAND_ONLY");
    for (const name of ["saveCampaignAction", "transitionCampaignAction"]) {
      const body = actions.text.slice(actions.text.indexOf(`export async function ${name}`));
      expect(body.indexOf("await gate()"), name).toBeGreaterThan(-1);
      expect(body.indexOf("await gate()"), name).toBeLessThan(body.indexOf("callWithSession") === -1 ? Infinity : body.indexOf("callWithSession"));
    }
    const schemas = FILES.find((f) => f.rel === "src/features/brand-campaigns/schemas.ts")!;
    expect(stripComments(schemas.text)).not.toMatch(/brandId|ownerId|userId|reviewedBy|reviewNote|status\s*:/);
  });
});

describe("offers, invitations and direct hires are no longer backed by mock services", () => {
  const OFFER_FILES = FILES.filter((f) => f.rel.startsWith("src/features/offers/") || f.rel.startsWith("src/features/creator/requests/"));

  it("the legacy mock hire and request services, types and components are gone", () => {
    for (const gone of ["src/features/public/hire", "src/services/hire-requests.service.ts", "src/services/mock/hire-requests.mock.ts", "src/services/creator.service.ts", "src/services/mock/creator.mock.ts", "src/types/hire-request.ts", "src/types/campaign-request.ts"]) {
      expect(FILES.some((f) => f.rel === gone || f.rel.startsWith(`${gone}/`)), gone).toBe(false);
    }
  });

  it("offer code imports no mock or service module", () => {
    expect(OFFER_FILES.length).toBeGreaterThan(10);
    for (const f of OFFER_FILES) expect(importsOf(f.text).filter((i) => /\/services\/|\/mock\//.test(i)), f.rel).toEqual([]);
  });

  it("offer browser code never calls the API itself; only Server Actions do", () => {
    for (const f of OFFER_FILES.filter((file) => isClientComponent(file.text))) {
      expect(f.text, f.rel).not.toMatch(/callApi|callWithSession|from "@\/lib\/api\/(?:client|config)"|\bfetch\(/);
    }
  });

  it("every offer Server Action checks the session and role first, and accepts no owner, price or status", () => {
    const actions = FILES.find((f) => f.rel === "src/features/offers/actions.ts")!;
    expect(actions.text).toContain("authorizeAction({ role }");
    for (const name of ["submitHireAction", "answerOfferAction", "decideOfferAction"]) {
      const body = actions.text.slice(actions.text.indexOf(`export async function ${name}`));
      expect(body.indexOf("await gate("), name).toBeGreaterThan(-1);
      expect(body.indexOf("await gate("), name).toBeLessThan(body.indexOf("callWithSession"));
    }
    const schemas = FILES.find((f) => f.rel === "src/features/offers/schemas.ts")!;
    expect(stripComments(schemas.text)).not.toMatch(/brandId|creatorId|ownerId|userId|priceXaf|status\s*:/);
  });

  it("the hire and inbox screens make no promise the platform cannot keep (no 48-hour reply, no negotiated price, no workload, no auto-suggestions)", () => {
    for (const f of OFFER_FILES) {
      expect(stripComments(f.text), f.rel).not.toMatch(/48 hours|agree on the final price|polite auto-message|suggest other matching|Why you matched|activeCampaigns|maxActiveCampaigns/);
    }
  });
});

describe("notifications are real and server-side", () => {
  const FILES_N = FILES.filter((f) => f.rel.startsWith("src/features/notifications/"));

  it("no mock or service is imported and browser code never calls the API", () => {
    expect(FILES_N.length).toBeGreaterThan(6);
    for (const f of FILES_N) {
      expect(importsOf(f.text).filter((i) => /\/services\/|\/mock\//.test(i)), f.rel).toEqual([]);
      if (isClientComponent(f.text)) expect(f.text, f.rel).not.toMatch(/callApi|callWithSession|from "@\/lib\/api\/(?:client|config)"|\bfetch\(/);
    }
  });

  it("every notification Server Action checks the session first and accepts only an id", () => {
    const actions = FILES_N.find((f) => f.rel.endsWith("actions.ts"))!;
    for (const name of ["markNotificationReadAction", "markAllNotificationsReadAction"]) {
      const body = actions.text.slice(actions.text.indexOf(`export async function ${name}`));
      expect(body.indexOf("await gate()"), name).toBeGreaterThan(-1);
      expect(body.indexOf("await gate()"), name).toBeLessThan(body.indexOf("callWithSession"));
    }
    const schemas = FILES_N.find((f) => f.rel.endsWith("schemas.ts"))!;
    expect(stripComments(schemas.text)).not.toMatch(/userId|readAt|title|body/);
  });

  it("the screens never promise e-mail or SMS delivery", () => {
    for (const f of FILES_N) {
      const text = stripComments(f.text);
      for (const match of text.matchAll(/e-?mail|sms/gi)) {
        const around = text.slice(Math.max(0, match.index! - 40), match.index! + 40);
        expect(around, f.rel).toMatch(/nothing is sent|only/i);
      }
    }
  });
});

describe("funding is real, server-side and never simulated by the frontend", () => {
  const FUNDING = FILES.filter((f) => f.rel.startsWith("src/features/funding/"));

  it("the legacy mock funding flows and services are gone", () => {
    for (const gone of ["src/features/account/brand-payments/sections", "src/features/account/brand-payments/actions.ts", "src/features/brand/payments"]) {
      expect(FILES.some((f) => f.rel === gone || f.rel.startsWith(`${gone}/`)), gone).toBe(false);
    }
    const payments = FILES.find((f) => f.rel === "src/services/payments.service.ts")!;
    expect(payments.text).not.toMatch(/export async function fundCampaign|listBrandPayments|summarizeBrandPayments/);
    const campaignPayments = FILES.find((f) => f.rel === "src/services/campaign-payments.service.ts")!;
    expect(campaignPayments.text).not.toMatch(/fundCampaign|MOCK_CAMPAIGN_PAYMENTS|MOCK_HIREABLE/);
  });

  it("funding code imports no mock or service module and browser code never calls the API", () => {
    expect(FUNDING.length).toBeGreaterThan(6);
    for (const f of FUNDING) {
      expect(importsOf(f.text).filter((i) => /\/services\/|\/mock\//.test(i)), f.rel).toEqual([]);
      if (isClientComponent(f.text)) expect(f.text, f.rel).not.toMatch(/callApi|callWithSession|from "@\/lib\/api\/(?:client|config)"|\bfetch\(/);
    }
  });

  it("every funding Server Action checks the session and role first", () => {
    const actions = FUNDING.find((f) => f.rel.endsWith("actions.ts"))!;
    expect(actions.text).toContain('authorizeAction({ role: "brand" }');
    for (const name of ["startFundingAction", "refreshFundingAction"]) {
      const body = actions.text.slice(actions.text.indexOf(`export async function ${name}`));
      expect(body.indexOf("await gate()"), name).toBeGreaterThan(-1);
      const firstCall = Math.min(...["callWithSession", "current("].map((needle) => body.indexOf(needle)).filter((i) => i >= 0));
      expect(body.indexOf("await gate()"), name).toBeLessThan(firstCall);
    }
  });

  it("no amount, status, provider or evidence of payment can be sent from the browser, and no code computes a fee or a payment outcome", () => {
    const schemas = FUNDING.find((f) => f.rel.endsWith("schemas.ts"))!;
    expect(stripComments(schemas.text)).not.toMatch(/amount|status|provider|brandId|outcome|simulat/i);
    for (const f of FUNDING) {
      const code = stripComments(f.text);
      expect(code, f.rel).not.toMatch(/PLATFORM_FEE|feeRate|feeXaf|netXaf|\* 0\.2|\* 0\.8|\* 20 \/ 100/);
      expect(code, f.rel).not.toMatch(/status:\s*["']funded["']\s*[,}]\s*(?:as const)?;?\s*$/m);
    }
  });

  it("the simulation controls exist only in the backend: no frontend file mentions the mode or the reserved numbers", () => {
    for (const f of FILES) expect(stripComments(f.text), f.rel).not.toMatch(/PAYMENTS_SIMULATION_MODE|auto_succeed|auto_fail|670000001|670000002|670000003/);
  });
});

describe("administration is real, permissioned and honest", () => {
  const ADMIN = FILES.filter((f) => f.rel.startsWith("src/features/admin/"));

  it("the legacy mock admin modules are gone (users, payments, dashboard), including their actions and services", () => {
    for (const gone of ["src/features/admin-panel/users", "src/features/admin-panel/payments", "src/features/admin-panel/dashboard", "src/services/dashboard.service.ts"]) {
      expect(FILES.some((f) => f.rel === gone || f.rel.startsWith(`${gone}/`)), gone).toBe(false);
    }
  });

  it("admin code imports no mock or service module and browser code never calls the API", () => {
    expect(ADMIN.length).toBeGreaterThan(15);
    for (const f of ADMIN) {
      expect(importsOf(f.text).filter((i) => /\/services\/|\/mock\//.test(i)), f.rel).toEqual([]);
      if (isClientComponent(f.text)) expect(f.text, f.rel).not.toMatch(/callApi|callWithSession|from "@\/lib\/api\/(?:client|config)"|\bfetch\(/);
    }
  });

  it("every admin Server Action checks the exact permission first", () => {
    const actions = ADMIN.find((f) => f.rel.endsWith("actions.ts"))!;
    expect(actions.text).toContain('authorizeAction({ role: "admin", permission }');
    const expected: Record<string, string> = { moderateUserAction: "users.moderate", decideApplicationAction: "applications.review", decideCampaignAction: "campaigns.review", releasePaymentAction: "payments.release" };
    for (const [name, permission] of Object.entries(expected)) {
      const body = actions.text.slice(actions.text.indexOf(`export async function ${name}`));
      expect(body.indexOf(`await gate("${permission}")`), name).toBeGreaterThan(-1);
      expect(body.indexOf(`await gate("${permission}")`), name).toBeLessThan(body.indexOf("callWithSession"));
    }
  });

  it("no action input can carry a status, an actor, a reviewer or a permission", () => {
    const schemas = ADMIN.find((f) => f.rel.endsWith("schemas.ts"))!;
    expect(stripComments(schemas.text)).not.toMatch(/status|actor|reviewer|permission|role/i);
  });

  it("each admin page requires the exact permission before rendering", () => {
    const pages: [string, string][] = [["users", "users.view"], ["applications", "applications.review"], ["campaigns", "campaigns.review"], ["payments", "payments.view"]];
    for (const [route, permission] of pages) {
      for (const file of [`src/app/admin/${route}/page.tsx`, `src/app/admin/${route}/[id]/page.tsx`]) {
        const page = FILES.find((f) => f.rel === file)!;
        expect(page.text, file).toContain(`"${permission}"`);
        expect(page.text, file).toMatch(/await requireAdmin\(/);
      }
    }
  });

  it("no admin screen offers what the API cannot do: bulk actions, flags, messages, invitations, revenue figures", () => {
    for (const f of ADMIN) expect(stripComments(f.text), f.rel).not.toMatch(/bulk|toggleFlag|sendUserMessage|inviteTeamMember|platform revenue|Total revenue/i);
  });
});

describe("public creator pages are real, anonymous and limited to public fields", () => {
  const PUBLIC = FILES.filter((f) => f.rel.startsWith("src/features/public/creators/"));

  it("the mock influencer services, data and types are gone", () => {
    for (const gone of ["src/services/influencers.service.ts", "src/services/mock/influencers.mock.ts", "src/services/mock/influencer-profiles.mock.ts", "src/services/mock/influencer-filters.mock.ts", "src/features/public/influencer-profile/sections/payment-methods.tsx", "src/features/public/influencers/influencer-query.ts"]) {
      expect(FILES.some((f) => f.rel === gone), gone).toBe(false);
    }
    expect(FILES.some((f) => importsOf(f.text).some((i) => /influencers\.service|influencers\.mock|influencer-profiles\.mock|influencer-filters\.mock/.test(i)))).toBe(false);
  });

  it("the loaders never read the session: only the visitor's address is forwarded", () => {
    const server = PUBLIC.find((f) => f.rel.endsWith("server.ts"))!;
    const code = stripComments(server.text);
    expect(code).not.toMatch(/callWithSession|readSessionToken|getSession\b|cookies\(/);
    expect(code).toContain("getForwardedClientIp");
  });

  it("every public API operation takes no session", () => {
    const endpoints = FILES.find((f) => f.rel === "src/lib/api/endpoints.ts")!;
    for (const name of ["publicCreators", "publicCreator", "publicCreatorFilters"]) expect(endpoints.text).toMatch(new RegExp(`${name}: endpoint\\(\\{[^}]*auth: "none"`));
  });

  it("the public pages show no photo, payment method, deposit wording, activity badge or mock marketing claim", () => {
    const files = FILES.filter((f) => f.rel.startsWith("src/features/public/influencer-profile/") || f.rel.startsWith("src/features/public/influencers/") || f.rel === "src/components/shared/influencer-card.tsx" || f.rel === "src/features/public/home/sections/featured-influencers.tsx");
    for (const f of files) {
      const code = stripComments(f.text);
      expect(code, f.rel).not.toMatch(/imageUrl|next\/image|paymentMethods|acceptedPaymentMethods|depositTerms|photoFileId|\bactivity\b/);
      expect(code, f.rel).not.toMatch(/most sought-after|proven reach/);
    }
  });

  it("the Hire buttons lead to the real hire flow, which requires a signed-in brand", () => {
    const card = FILES.find((f) => f.rel === "src/components/shared/influencer-card.tsx")!;
    const header = FILES.find((f) => f.rel === "src/features/public/influencer-profile/sections/profile-header.tsx")!;
    for (const f of [card, header]) expect(f.text, f.rel).toMatch(/\/influencers\/\$\{[a-zA-Z.]*username\}\/hire/);
    const hire = FILES.find((f) => f.rel === "src/app/(public)/influencers/[username]/hire/page.tsx")!;
    expect(hire.text).toContain("requireBrand");
  });
});

describe("creator campaign browse and apply are real and server-side", () => {
  const CC = FILES.filter((f) => f.rel.startsWith("src/features/creator/campaigns/"));

  it("imports no mock or service module; browser code never calls the API", () => {
    expect(CC.length).toBeGreaterThan(8);
    for (const f of CC) {
      expect(importsOf(f.text).filter((i) => /\/services\/|\/mock\//.test(i)), f.rel).toEqual([]);
      if (isClientComponent(f.text)) expect(f.text, f.rel).not.toMatch(/callApi|callWithSession|from "@\/lib\/api\/(?:client|config)"|\bfetch\(/);
    }
  });

  it("each Server Action checks the active creator first, and the input has no creator, brand, status or date", () => {
    const actions = CC.find((f) => f.rel.endsWith("actions.ts"))!;
    expect(actions.text).toContain('authorizeAction({ role: "creator" }');
    for (const name of ["applyToCampaignAction", "withdrawApplicationAction"]) {
      const body = actions.text.slice(actions.text.indexOf(`export async function ${name}`));
      expect(body.indexOf("await gate()"), name).toBeGreaterThan(-1);
      expect(body.indexOf("await gate()"), name).toBeLessThan(body.indexOf("callWithSession"));
    }
    const schemas = CC.find((f) => f.rel.endsWith("schemas.ts"))!;
    expect(stripComments(schemas.text)).not.toMatch(/creatorId|brandId|status|startDate|endDate|origin/);
  });

  it("both pages require an active creator before rendering", () => {
    for (const file of ["src/app/creator/(dashboard)/campaigns/page.tsx", "src/app/creator/(dashboard)/campaigns/[id]/page.tsx"]) {
      expect(FILES.find((f) => f.rel === file)!.text, file).toMatch(/await requireCreator\(/);
    }
  });
});
