// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/public/creators/server", () => ({
  loadFilters: vi.fn(async () => ({ niches: [], cities: [], platforms: [], languages: [], sorts: [] })),
  loadFeatured: vi.fn(async () => ({ items: [{ username: "kevin.fitness", displayName: "Kevin Fitness" }], nextCursor: null })),
}));
vi.mock("@/features/public/creators/query", () => ({ buildSearchOptions: () => ({}) }));
vi.mock("@/features/public/home/sections/hero-search", () => ({ HeroSearch: () => null }));

const { Hero } = await import("@/features/public/home/sections/hero");
const { PostCampaign } = await import("@/features/public/home/sections/post-campaign");
const { ForBrandsPage } = await import("@/features/public/for-brands/for-brands-page");
const { AboutPage } = await import("@/features/public/about/about-page");
const { Campaigns } = await import("@/features/public/campaigns/sections/campaigns");

/** Figures and promises the platform has no source for. Matching any of them on a public page is a defect (deployment audit F-1). */
const INVENTED: [string, RegExp][] = [
  ["verified-influencer count", /1,284|\bVerified Influencers\b/],
  ["brands-partnered count", /340\+|Brands Partnered/],
  ["combined audience reach", /25M\+|Combined Audience Reach/],
  ["campaign sent to a number of influencers", /1\.2\s?m\b/i],
  ["creator count", /300\+/],
  ["niche and city counts that are not read from the data", /Content niches|Cities covered/],
  ["withdrawal timing promise", /typical time to receive a withdrawal|\b24\s?h(ours)?\b/i],
  ["'trusted by N brands'", /trusted by\s+\S+\s+brands/i],
];

describe("public pages state no invented figure, creator count or payout promise (F-1)", () => {
  const pages: [string, () => Promise<React.ReactElement>][] = [
    ["Home hero", async () => await Hero()],
    ["Home post-campaign section", async () => PostCampaign()],
    ["For brands", async () => await ForBrandsPage()],
    ["About", async () => await AboutPage()],
    ["Campaigns section", async () => await Campaigns()],
  ];

  it.each(pages)("%s", async (_name, make) => {
    const { container } = render(await make());
    const text = container.textContent ?? "";
    expect(text.length).toBeGreaterThan(40);
    for (const [what, pattern] of INVENTED) expect(text, what).not.toMatch(pattern);
  });

  it("the For-brands page no longer carries the generated 'match finder' or any list of creators it made up", async () => {
    const { container } = render(await ForBrandsPage());
    expect(container.querySelector("form, select, input[type='range']")).toBeNull();
    expect(container.textContent).not.toMatch(/strong match|good match|\d+ (creators|influencers) (match|found)/i);
  });

  it("the Home hero shows only the creators the public API returned, without a count claim", async () => {
    const { container } = render(await Hero());
    expect(container.querySelector('[aria-label="Some of our approved creators"]')).not.toBeNull();
    expect(container.textContent).not.toMatch(/\d[\d,.]*\+?\s*(verified|influencers|brands)/i);
  });
});

describe("the sources that produced those claims are gone", () => {
  const SRC = path.resolve(__dirname, "../../src");
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => (statSync(path.join(dir, name)).isDirectory() ? walk(path.join(dir, name)) : [path.join(dir, name)]));

  it("no generated-creator, platform-stat or match-finder code remains", () => {
    for (const gone of ["services/platform.service.ts", "services/mock/platform.mock.ts", "types/platform.ts", "features/public/for-brands/sections/creator-match-finder.tsx", "features/public/for-brands/sections/brand-stats.tsx"]) {
      expect(existsSync(path.join(SRC, gone)), gone).toBe(false);
    }
    const offenders = walk(SRC)
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .filter((f) => /MOCK_MATCHABLE_INFLUENCERS|getPlatformStats|previewCampaignMatches|MOCK_PLATFORM_STATS|typical time to receive a withdrawal|influencerReach/.test(readFileSync(f, "utf8")));
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});
