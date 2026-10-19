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
  const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
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
