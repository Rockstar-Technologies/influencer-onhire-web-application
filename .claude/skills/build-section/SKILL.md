---
name: build-section
description: Use when adding a new page, feature page, or UI section to Influencer On Hire (e.g. "add the hero section", "build the how-it-works section", "create the browse influencers page"). Defines where files go and how data must flow through a mock-backed service layer so swapping in a real API later touches nothing but the service file.
---

# Building a section or page in Influencer On Hire

This project uses a feature-based architecture under `src/`. Follow it exactly so new
sections stay consistent with the navbar/footer/coming-soon work already in place.

## Target project tree

This is the full structure the project converges on as sections and pages get built.
Not everything here exists yet — only create a file/folder when something actually
needs it (see the checklist below). Treat this as the map, not a to-do list to
scaffold in one shot.

```
src/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx
│   ├── about/page.tsx
│   ├── services/page.tsx
│   ├── contact/page.tsx
│   ├── coming-soon/page.tsx
│   └── admin/page.tsx
│
├── features/
│   ├── public/
│   │   ├── home/
│   │   │   ├── home-page.tsx
│   │   │   └── sections/
│   │   │       ├── hero.tsx
│   │   │       ├── services-preview.tsx
│   │   │       ├── how-it-works.tsx
│   │   │       ├── why-choose-us.tsx
│   │   │       └── call-to-action.tsx
│   │   ├── about/
│   │   │   ├── about-page.tsx
│   │   │   └── sections/
│   │   ├── services/
│   │   │   ├── services-page.tsx
│   │   │   └── sections/
│   │   ├── contact/
│   │   │   ├── contact-page.tsx
│   │   │   └── sections/
│   │   └── coming-soon/
│   │       └── coming-soon-page.tsx
│   │
│   └── admin-panel/
│       ├── dashboard/dashboard-page.tsx
│       ├── users/
│       └── applications/          # creator applications awaiting review
│
├── components/
│   └── shared/
│       ├── navbar.tsx
│       ├── footer.tsx
│       ├── button.tsx
│       ├── input.tsx
│       └── section-heading.tsx
│
├── services/
│   ├── <domain>.service.ts
│   └── mock/<domain>.mock.ts
│
├── types/
│   └── <domain>.ts
│
├── constants/
│   └── design-tokens.ts
│
└── lib/
    └── utils.ts

public/
├── images/
│   ├── home/
│   └── general/
├── logos/
└── icons/
```

`admin-panel` is a stub for later — don't build it out until it's explicitly
requested. There's no "nannies" folder here; that was carried over from an unrelated
template and doesn't belong in this project.

## File placement

```
src/app/<route>/page.tsx                        # thin route file, no markup logic
src/features/public/<page>/<page>-page.tsx       # composes the page from sections
src/features/public/<page>/sections/<name>.tsx   # one section = one component
src/components/shared/                           # cross-page components (Button, Navbar, Footer, ...)
src/services/<domain>.service.ts                 # data access — see below
src/types/<domain>.ts                            # shared TS interfaces for that domain
src/constants/design-tokens.ts                   # link tables, shared constant lists
```

- `app/<route>/page.tsx` only imports and renders the matching `*-page.tsx`. It never
  contains markup or data-fetching itself — that keeps routing separate from UI.
- A page is a stack of section components: `home-page.tsx` renders `<Hero />`,
  `<ServicesPreview />`, etc. in order, each imported from `./sections/`.
- Section and page components are **named exports** (`export function Hero() {}`),
  not default exports. Only files under `app/` use `export default`, because Next.js
  requires that for route files.
- If a link doesn't have a real destination yet, point it at
  `/coming-soon?title=...` (see `constants/design-tokens.ts` for the existing
  pattern) instead of leaving it dead or faking a feature that isn't built.

## Data: always go through a service, never hardcode data in a component

Every piece of non-trivial content a section shows (influencer cards, testimonials,
pricing tiers, stats, FAQ items, campaign categories, etc.) must be fetched through a
function in `src/services/`, never inlined as a literal array in the component. This
is what lets mock data be swapped for a real backend later by editing one file.

**1. Define the shape in `src/types/`:**

```ts
// src/types/influencer.ts
export interface Influencer {
  id: string;
  username: string;
  displayName: string;
  niche: string;
  avatarUrl: string;
  followers: number;
  rating: number;
}
```

**2. Write the service with a real async signature, backed by mock data for now:**

```ts
// src/services/influencers.service.ts
import type { Influencer } from "@/types/influencer";
import { MOCK_INFLUENCERS } from "./mock/influencers.mock";

export async function getFeaturedInfluencers(): Promise<Influencer[]> {
  // TODO: replace with `return fetch("/api/influencers/featured").then(r => r.json())`
  return MOCK_INFLUENCERS.filter((i) => i.rating >= 4.5);
}

export async function getInfluencerByUsername(username: string): Promise<Influencer | null> {
  return MOCK_INFLUENCERS.find((i) => i.username === username) ?? null;
}
```

```ts
// src/services/mock/influencers.mock.ts
import type { Influencer } from "@/types/influencer";

export const MOCK_INFLUENCERS: Influencer[] = [
  { id: "1", username: "amara.styles", displayName: "Amara", niche: "Fashion", avatarUrl: "/images/home/amara.jpg", followers: 84000, rating: 4.9 },
  // ...
];
```

Rules for the service layer:
- Every exported function returns a `Promise`, even though it currently resolves
  mock data synchronously — this keeps the call signature identical to a real
  `fetch`-based implementation, so nothing at the call site changes later.
- One service file per domain (`influencers.service.ts`, `campaigns.service.ts`,
  `testimonials.service.ts`, ...), named `get*` / `list*` / `create*` like a real API
  client.
- Mock fixtures live in `src/services/mock/<domain>.mock.ts` and are only imported by
  their matching service file — components and pages never import mock data directly.
- Don't add fake network delay, error simulation, or pagination unless the section
  actually needs to demonstrate that behavior. Keep the mock implementation as plain
  as the real one would be.

**3. Consume it from a section (server component — the default):**

```tsx
// src/features/public/home/sections/services-preview.tsx
import { getFeaturedInfluencers } from "@/services/influencers.service";

export async function ServicesPreview() {
  const influencers = await getFeaturedInfluencers();

  return (
    <section className="bg-surface px-4 py-16 sm:px-6 lg:px-8">
      {/* render influencers */}
    </section>
  );
}
```

Sections are Server Components by default and can `await` a service call directly —
no `useEffect`/`useState` data-fetching unless the section genuinely needs client
interactivity (filters, search-as-you-type, etc.), in which case fetch inside a
`'use client'` component via the same service function.

## Styling

- Use the design tokens already defined in `globals.css` / `@theme inline`
  (`bg-primary`, `text-heading`, `text-body`, `text-muted`, `bg-surface`,
  `bg-surface-alt`, `border-border`) instead of raw Tailwind grays or hardcoded hex
  values, so new sections stay visually consistent with the navbar/footer.
- Reuse `components/shared/button.tsx` for any call-to-action instead of writing a
  new button style inline. Add new shared primitives (`input.tsx`,
  `section-heading.tsx`, `card.tsx`, ...) to `components/shared/` only once a second
  section actually needs them — don't pre-create empty ones.
- Use the `cn()` helper from `@/lib/utils` for conditional class names.

## Checklist for a new section

1. Does it need data? Add/extend a `types/` interface and a `services/` function
   (with mock fixture) before writing markup.
2. Create `features/public/<page>/sections/<name>.tsx` as a named export.
3. Wire it into `features/public/<page>/<page>-page.tsx` in the right order.
4. Any link without a real destination → `/coming-soon?title=...`.
5. Style with existing design tokens and shared components; only add new shared
   components when something is actually reused.
6. Run `npx tsc --noEmit` and `npx eslint .` before calling it done.
