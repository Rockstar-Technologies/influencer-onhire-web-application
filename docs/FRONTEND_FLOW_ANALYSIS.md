# Frontend Flow Analysis — Influencer On Hire

Source analysed: `influencer-onhire-web-application/` (Next.js 16.3.5, React 19, Tailwind 4, TypeScript; no other runtime deps). ~18.4k lines under `src/`.
Convention: **[C]** = confirmed in source code; **[A]** = assumption / inference; **[?]** = cannot be determined.

> Scope note: the project root `influencer-onhire-web/` does not exist on disk; the workspace root is `/var/www/html/influencers-on-hire/`, and this file lives there beside the frontend directory. The frontend has its own `.git` (not touched).

---

## 1. Application overview

Cameroon-focused influencer marketplace. **Brands** post campaigns / hire creators; **creators (influencers)** apply, receive campaign requests, deliver, and get paid; **admins** run user approval, payments/escrow release, support, and a KPI dashboard. Money is in **CFA/FCFA** via **MTN MoMo** and **Orange Money**, held in **escrow** with a **20% platform fee** [C].

Architecture facts [C]:
- **There is no backend.** Zero `fetch`/axios calls, no env vars, no DB. All data comes from `src/services/*.service.ts`, which return in-memory arrays from `src/services/mock/*.mock.ts`. Every service function carries a `// TODO: replace with fetch("/api/...")` comment — these comments are the intended API surface (listed in §13).
- Server Actions (`"use server"`) exist for: demo sign-in/out, hire request, direct-campaign submit + reach estimate, brand fund, creator cashout + withdraw, admin user actions / release payment / create ticket. They validate input and call the same mock services.
- Some screens are client components calling services directly from the browser (legacy sign-up/sign-in forms, post-campaign form, creator apply wizard, creator requests/earnings dashboards, brand campaign-payments dashboard). These will need real HTTP endpoints.
- Mock state is module-level and resets on server restart; some mocks use `Date.now()`-relative timestamps.

**Important structural finding — two parallel, overlapping implementations** exist for the same concepts (a backend must pick one model or reconcile them):

| Concept | Implementation A (legacy "dashboard" area) | Implementation B (newer "account"/admin area) |
|---|---|---|
| Auth | `auth.service` (email+password, `/sign-up`, `/login`) — **not connected to any session** | `session.service` + `signInAction` (demo account picker at `/sign-in`, httpOnly cookie) |
| Campaign posting | `/campaigns/new` → `campaigns.service` (free-text fields, drafts, preview, `/campaigns/posted`) | `/post-campaign` → `direct-campaigns.service` + server action (select-based fields, niche, no drafts) |
| Escrow payment | `campaign-payments.service` (`/brand/campaign-payments`; statuses `on_hold/payout_requested/released`; methods `mtn_momo/orange_money`; no fee) | `payments.service` (`/brand/payments`, `/creator/payments`, `/admin/payments`; statuses `held/requested/released`; methods `"MTN MoMo"/"Orange Money"`; 20% fee) |
| Creator earnings | `earnings.service` (`/creator/earnings`) | `payments.service` wallet/withdrawals (`/creator/payments`) |
| User/Account IDs | `brand-lumiere`, `inf-amara`, `usr-*` | `u-101…` |

IDs, enums and amounts are **not consistent across A and B** (e.g. Amara Kilonzo `inf-amara`/`usr-amara` vs Amara Nkemelu `u-101`). [C]

---

## 2. Route / page inventory

### Public (layout: Navbar + Footer)
| Route | Purpose | Data source |
|---|---|---|
| `/` | Home: hero search, featured influencers (rating ≥ 4.6, max 6), platform stats | `influencers.service`, `platform.service` |
| `/influencers` | Browse/search/filter/sort | `searchInfluencers`, `getInfluencerSearchOptions`; query params `q`, `sort`, filter keys |
| `/influencers/[username]` | Influencer public profile; 404 UI if unknown | `getInfluencerProfile` |
| `/influencers/[username]/hire` | Hire request form | `getInfluencerProfile`, `getCampaignDurations`; server action `submitHireRequest` |
| `/for-brands`, `/for-creators` | Marketing content (steps, FAQs, stats) | `getForBrandsContent`, `getForCreatorsContent` |
| `/about` | Static content | `getAboutContent` |
| `/campaigns` | Marketing landing for "post a campaign" (mock creator cards, 1.2m reach copy) | `getCampaignOverview`, `getCampaignPreview` |
| `/campaigns/new?draft=` | Legacy post-campaign form (impl. A) | `campaigns.service` |
| `/campaigns/preview?draft=` | Preview draft, match summary, publish | `campaigns.service`, `accounts.service` |
| `/campaigns/posted?id=` | Success page + match summary; "missing" state | `getCampaignById` |
| `/post-campaign` | Newer post-campaign form (impl. B) with live reach estimate | server actions `submitCampaign`, `estimateReach` |
| `/sign-up` | Sign-up (brand/creator) | `auth.service.signUp`, `getPasswordRules` |
| `/login?email=` | Email+password login (impl. A, no session) | `auth.service.signIn` |
| `/sign-in?next=&denied=&error=` | **Demo** account picker (impl. B) — lists all active accounts, no password | `listActiveAccounts`, `signInAction` |
| `/for-creators/apply/profile` → `/audience` → `/rates` → `/submitted?id=` | 3-step creator application wizard | `creator-application.service` |
| `/contact`, `/services` | "Coming soon" placeholders | — |
| `/coming-soon?title=` | Placeholder (Terms, Privacy, Escrow Policy, Reset Password, social links, "My Creator Profile", "Browse Influencers" from brand sidebar) | — |

### Brand
| Route | Notes |
|---|---|
| `/brand/payments` | Session-guarded (`requireAccount("brand")`). Brand view of escrow payments + fund dialog [impl. B] |
| `/brand/campaign-payments?q=` | **No auth guard**; uses hard-coded brand `brand-lumiere`. Sidebar dashboard [impl. A] |

### Creator
| Route | Notes |
|---|---|
| `/creator/requests?q=` | Campaign requests inbox (accept/decline). **No auth guard**; hard-coded `inf-amara` |
| `/creator/earnings?q=` | Earnings & payouts [impl. A]. **No auth guard** |
| `/creator/payments` | Session-guarded (`requireAccount("influencer")`); earnings, cashout, wallet, withdraw [impl. B] |

### Admin (no auth anywhere — every admin file has a `TODO: once auth exists…`)
| Route | Notes |
|---|---|
| `/admin?range=7d\|30d\|90d` | KPI dashboard (default 30d) |
| `/admin/export?range=` | CSV download (route handler); formula-injection-safe cells, UTF-8 BOM |
| `/admin/users` (+ `q,type,status,location,niche,engagement`) | Directory, bulk actions, security alerts, moderation queue, admin team/invite, messaging |
| `/admin/users/[id]` | User profile: performance, trend, disputes, transactions, documents, notifications |
| `/admin/payments` (+ `q,status`) | Ledger, stats, monthly analytics, release payout |
| `/admin/support` (+ `q,status`) | Ticket table, create ticket |
| Admin nav placeholders w/o href: Campaigns, Disputes, Reports | Not built [C] |

---

## 3. User roles and permissions

Roles [C]: `brand`, `creator`/`influencer` (UI says "creator", route area `/creator`, user-management type `influencer`), `admin` (admin team roles: `Super Admin`, `Campaign Manager`, `Finance`, `Support Agent`). Public visitors are unauthenticated.

Enforcement actually present:
- `requireAccount(type)` redirects to `/sign-in?next=…` when no cookie, or `/sign-in?denied=<area>` on type mismatch. Applied to `/brand/payments`, `/creator/payments` and their server actions. Called inside every action because layouts don't rerun on client navigation [C].
- Only accounts with `status === "active"` can sign in; `pending / suspended / rejected` are rejected (`?error=unavailable`) [C].
- Data-shaping per role: brand sees `deposited` but **no fee / creator payout split**; creator sees `gross/fee/net` split; admin sees everything [C] (comment: "fields an account must not see never reach the browser").
- Cashout: only the creator owning the payment, while `status === held` [C].
- **Not enforced** (TODOs): admin authentication/role checks (comments say release payment → Super Admin + Finance only), brand-only for hire/campaign submit, dashboard areas `/brand/campaign-payments`, `/creator/requests`, `/creator/earnings`.
- Intended RBAC for admin team roles is **named but not mapped** to permissions except the single note on payment release [A for rest].

---

## 4. Major user journeys

1. **Discover → hire**: `/` or `/influencers` (search/filter) → profile → "Hire" → hire form → "pending" request with reference `HR-XXXXXX`; copy says *no payment taken now; influencer reviews first; payment held in escrow until delivered*.
2. **Brand posts campaign** (A or B) → status `pending_review` → "sent to matching verified influencers" → influencer accepts/declines → brand funds escrow → creator delivers + requests cashout (report with links) → admin releases → creator wallet credited → creator withdraws to MoMo.
3. **Creator onboarding**: `/for-creators` → sign-up → 3-step application → `under_review` → admin approves (`pending → active`) → profile goes live.
4. **Admin ops**: approve/reject/suspend/reactivate users (bulk, notify), release payouts, triage tickets, resolve moderation flags, dismiss security alerts, invite team.

## 5. Authentication flow

- **Sign-up (A)** [C]: fields `accountType (brand|creator)`, `fullName` (≥2; "Business name" for brand), `email` (regex), `phone` (Cameroon mobile: 9 digits starting with 6, optional `+237`, stored as `677 123 456`), `password` (≥ 8 from `getPasswordRules`, must contain a letter and a digit), terms checkbox (client only, not sent). Duplicate email (case-insensitive, trimmed) → `EmailTakenError` (expected HTTP 409). On success redirect: brand → `/campaigns/new`, creator → `/for-creators/apply/profile`. **No session is created.**
- **Login (A)** [C]: `email`, `password`, `remember`; failure → `InvalidCredentialsError` (expected 401); success redirects brand → `/brand/payments`, creator → `/creator/requests`. `remember` "controls the session cookie's lifetime" (service comment). Returns `UserAccount` but **no cookie is set**.
- **Demo sign-in (B)** [C]: POST `accountId` (+`next`) → cookie `ioh_demo_account` (httpOnly, sameSite=lax, path `/`, maxAge 8h) holding only the raw account id (spoofable — acknowledged in code). `next` honoured only if it matches `^/(brand|creator)/[a-z-]+$` and stays in that account's area; default `/<area>/payments`. Sign-out deletes cookie → `/sign-in`.
- "Forgot password" → coming-soon (no reset flow) [C]. No email verification, no phone OTP (copy says "password or phone code replaces this before launch") [C/?].

---

## 6. Influencer (creator) flow

1. **Application wizard** (drafts persisted step by step, then submitted once) [C]:
   - Step 1 *Profile*: `fullName` (≥2), optional `photoDataUrl` (image ≤ 3 MB, currently base64 data URL), `niche` (select), `city` (select), `bio` (≥ 40 chars).
   - Step 2 *Audience*: ≥1 platform among facebook/instagram/tiktok/youtube each with `handle` + `followers > 0`; total followers ≥ 1,000; ≤ 3 past collaborations `{brand, description?, year(4 digits)}`; ≥1 `brandFit` tag.
   - Step 3 *Rates*: per-platform `price` ≥ 5,000 Frs; `minimumBooking` (1 week / 2 weeks / 1 month); `deliverables` (text, default "1 dedicated post + 3 stories per platform"); `revisions`; `usageRights`; `depositTerms`; `payoutAccounts[]` (≥1 of mtn_momo / orange_money with 9-digit 6xxxxxxxx number); confirmation checkbox.
   - Submit → `CreatorApplication {id APP-…, status "under_review"}` and the draft is cleared; step 3 requires audience step done (redirect otherwise). Drafts are global in the mock (not per-user) [C]; per-user needed.
2. **Campaign requests** (`/creator/requests`): list sorted by `respondedAt ?? receivedAt` desc; pending cards show brand, niche, city, budget, duration, deliverables summary, `matchReasons[]`. Accept/decline; decline requires one of `["Schedule conflict","Budget doesn't match my rates","Not a fit for my audience","Other"]`. Rules: only `pending` can be answered; accept blocked when `activeCampaigns >= maxActiveCampaigns` (mock = 2/2 → "at capacity"). Client-side `q` search over requests.
3. **Earnings** (`/creator/earnings`, impl. A): summary `availableBalance, inEscrow (on_hold), pendingPayout (payout_requested), totalEarned`; per-campaign earning rows; "Request payout" on `on_hold` only; withdraw `amount ≥ 1,000` and ≤ available, `method`, `phone`; withdrawal list status `processing|completed`.
4. **Payments** (`/creator/payments`, impl. B): payments with `gross/fee/net`, cashout form (`summary` 20–1500 chars, `links` 1–5 http(s) URLs one per line, ≤300 chars each), wallet (`available = released net − processing − withdrawn`), withdraw (≥1,000, MoMo/Orange, phone `^6\d{8}$`), notifications on events.

## 7. Client (brand) flow

- **Hire** an influencer (form §12). **Post a campaign** (A or B). **Fund escrow**: brand picks creator + campaign name + amount + method + payer phone. Impl. B bounds: 10,000 ≤ amount ≤ 50,000,000 CFA, campaign name 3–80 chars, phone `^6\d{8}$`; creator must be an active `influencer`. Impl. A validates only amount > 0, phone, non-empty fields. Backend "collects the mobile money payment first" (service comment) [C].
- **Payments view**: status per payment (`held/requested/released`), delivery report (summary + links) visible after cashout request, summary tiles (`totalDeposited/onHold/awaitingRelease/released`).
- Brand is notified when creator submits delivery report and when payout released [C].
- Reference images for campaigns: max 5, ≤ 5 MB each, `image/*` — only the **count/filenames** are submitted (no upload yet) [C].
- Campaign preview page (A) shows brand name from `accounts.service`; draft save/update/delete/publish flow exists (§9).

## 8. Admin flow [C]

- **Dashboard**: KPIs (`activeCampaigns` current/previous, `platformRevenue` current/previous, `inEscrow`, `payoutRequests`, `openTickets`, `urgentTickets`) for 7/30/90 d; revenue series; 5 recent campaigns (`draft|scheduled|in-progress|pending-review|completed|overdue`); "needs attention" counts (urgent tickets, security alerts, payouts awaiting release, accounts awaiting approval, open disputes, reported content); top influencers ranked by **earnings** (not followers); CSV export.
- **Users**: filters; stats (`total, influencers, brands, pendingApproval, suspended`); bulk actions (≤ 200 ids) with state machine `approve: pending→active`, `reject: pending→rejected`, `suspend: active|pending→suspended`, `reactivate: suspended|rejected→active`, invalid transitions silently skipped; each change creates a user notification; send message (subject 3–120, body 10–2000) to selected users; flag/unflag user; security alerts (`failed-logins | follower-spike | payout-change`, severity high/medium, dismissible → deleted); moderation flags (`bio | campaign-description | media`; remove → notifies user, dismiss); admin team list + invite (`name` 2–80, `email` regex ≤120, `role` ∈ TEAM_ROLES, duplicate email rejected, status `invited`).
- **User profile**: performance (`lifetimeValue, campaignsCompleted, campaignSuccessRate, avgReviewScore, reviewCount`), monthly trend, disputes (`open | resolved-in-favour | resolved-against`), wallet transactions (`escrow-held|released|refunded|withdrawal|deposit`), compliance documents (`contract|tax-id|business-registration|national-id` with status), notifications.
- **Payments**: search over invoice/campaign/brand/creator + status filter; `releasePayment` only from `requested`; creates notifications to both parties; monthly stats (`escrowVolume, commission, avgReleaseDays`) for 6 months.
- **Support**: tickets `{number, subject, message, from{name,role}, priority urgent|normal|low, status open|in-progress|resolved, firstResponseMinutes, resolvedAt}`; create-ticket dialog (admin enters on behalf of influencer/brand); stats (`open`, `urgent`, `resolvedThisWeek`, `avgResponseHours`). No reply/assign/status-change UI found [?].

---

## 9. Business entities

1. **UserAccount** (login identity) 2. **Brand profile** 3. **Creator/Influencer profile** (public) 4. **CreatorApplication** (+ draft) 5. **SocialAccount (per platform)** 6. **Collaboration** (past work) 7. **PlatformPrice / rate card** 8. **PayoutAccount** 9. **Campaign** (+ **CampaignDraft**) 10. **CampaignRequest** (campaign↔creator invitation) 11. **HireRequest** 12. **EscrowPayment** 13. **DeliveryReport** 14. **Withdrawal** (+ Wallet derived) 15. **Notification** 16. **SupportTicket** 17. **Dispute** 18. **ComplianceDocument** 19. **SecurityAlert** 20. **ModerationFlag** 21. **AdminTeamMember** 22. **Review/rating** (only aggregates seen) 23. Lookup/config: niches, cities, platforms, brand-fit tags, engagement levels, age ranges, interests, durations, decline reasons, minimum-booking/revision/usage/deposit option lists, content pages, platform stats.

## 10. Relationships [C unless marked]

- UserAccount 1—1 Brand profile **or** Creator profile (by `accountType`) [A on table split].
- Creator profile 1—N SocialAccount (platform, handle, followers); 1—N PlatformPrice; 1—N Collaboration (≤3 at apply); 1—N PayoutAccount; N—M brandFit tags; 1—N Withdrawal.
- CreatorApplication 1—1 (future) Creator profile; admin `approve` flips account `pending→active` [A: approval creates/publishes profile].
- Brand 1—N Campaign (draft and posted); Campaign N—M Creator via CampaignRequest (matching) [A: one request per matched creator].
- Brand 1—N HireRequest; Creator 1—N HireRequest (`influencerId`).
- Brand 1—N EscrowPayment; Creator 1—N EscrowPayment; EscrowPayment 0..1 DeliveryReport; EscrowPayment → "campaign" is **only a free-text name** in B (`campaign: string`) and a `campaignTitle` string in A — **no FK to a Campaign** [C]. Whether it should be linked is [?].
- User 1—N Notification, Dispute, ComplianceDocument, SecurityAlert, ModerationFlag.
- SupportTicket requester is **only a name + role string**, not a user FK [C].
- HireRequest has no link to a later EscrowPayment [?].

## 11. Entity fields

**UserAccount**: id, accountType, fullName, email (unique, lower-cased), phone (Cameroon mobile), password (hash needed), createdAt; admin view adds status (`active|pending|suspended|rejected`), location, niche/industry, compliance (`verified|in-review|missing`), flagged, lastActiveAt, joinedAt.
**Brand**: name ("Business name"), industry/niche, location, initials/accountLabel (derived), wallet `{available,inEscrow}` (admin-view, derivable).
**Influencer (public card)**: id, username (unique, URL slug e.g. `francis.ngannou`), name, niche (display), categories[] (slugs), location, imageUrl, language (`Bilingual|French|English`), rating, successRate (%), engagementRate (%), activity (text, e.g. "Active this week"), joinedAt, social {facebook,instagram,tiktok,youtube followers; 0 = absent}, startingPrice (= min platform price).
**Influencer profile (detail)**: bio, contentStyle, brandFit[], collaborations[{brand,campaign,year}], platformPricing{platform: CFA}, minimumBooking (text "1 month"), contractTerms[] (deliverables/revisions/usage/deposit lines), paymentMethods[] ("MTN MoMo","Orange Money","Bank transfer" — note bank transfer appears only here).
**CreatorApplication**: id `APP-…`, status `under_review`, submittedAt, basics{fullName, photo, niche, city, bio}, audience{platforms[{platform,handle,followers}], collaborations[{brand,description,year}], brandFit[]}, rates{prices[{platform,price}], minimumBooking, deliverables, revisions, usageRights, depositTerms, payoutAccounts[{method,number}]}.
**Campaign (A)**: id `CMP-…`, title, budget, startDate, endDate, deliverables, durationDays?, minEngagementRate?, ageRange? ("18–34"), location? (comma list), interests? (comma list), referenceImageNames[], status `pending_review|accepted|in_progress`, createdAt, match{matchedCount, niches[], locations[], minEngagementRate?}. **Draft**: same + updatedAt, id `DRF-…`.
**Campaign (B)**: id (uuid), reference `CMP-XXXXXX`, title, niche, budget, startDate, endDate, deliverables, minEngagement ("any"|"3"|"5"|"7"), ageRanges[], locations[], interests[], referenceImageCount, status `pending_review`, matchedCount, createdAt.
**CampaignRequest**: id, campaignTitle, brandName, niche, city, budget, durationDays, deliverablesSummary, matchReasons[], receivedAt, status `pending|accepted|declined`, respondedAt?, declineReason?. **Workload**: activeCampaigns, maxActiveCampaigns.
**HireRequest**: id, reference `HR-XXXXXX`, influencerId, fullName, location, socialHandle? (normalised `@handle`), promotion? (≤500), paymentMethod (one of influencer's), duration (value), status `pending`, createdAt.
**EscrowPayment (B)**: id, invoice `INV-<n>` (sequential), campaign (text), brand{id,name}, creator{id,name}, gross, method, status `held|requested|released`, fundedAt, requestedAt?, releasedAt?, report?{summary, links[], submittedAt}. Derived: fee = round(gross × 0.20), net = gross − fee. **(A)** adds reference `ESC-YYYY-xxxx`, payerPhone, deliverables[], uses `on_hold|payout_requested|released` and amount w/o fee.
**Withdrawal**: id, creatorId, amount, method, phone, status `processing|completed`, requestedAt, completedAt? (A uses `date`).
**Notification**: id, userId, title, body, sentAt (no read/unread state seen [?]).
**SupportTicket**: id, number (sequential), subject, message, from{name,role}, priority, status, createdAt, updatedAt, firstResponseMinutes?, resolvedAt?.
**Dispute**: id, campaign, reason, status, openedAt (user-attached). **ComplianceDocument**: id, kind, fileName, uploadedAt, status (`verified|in-review|rejected`). **SecurityAlert**: id, userId, userName, kind, detail, severity, detectedAt. **ModerationFlag**: id, userId, field, excerpt, reason, reportedAt. **TeamMember**: id, name, email, role, status `active|invited`, lastActiveAt.
**Trend / performance** (admin profile): month, audience, campaigns, revenue; lifetimeValue, campaignsCompleted, campaignSuccessRate, avgReviewScore, reviewCount.

## 12. Forms and submitted data

| Form | Fields (validation) | Submitted via |
|---|---|---|
| Sign up | accountType, fullName≥2, email, phone, password≥8 letter+digit, terms | `signUp` (client→service) |
| Login | email, password, remember | `signIn` |
| Demo sign-in | accountId, next | server action |
| Hire | fullName 2–80, location 2–80, socialHandle? `^@?[A-Za-z0-9._]{2,30}$`, promotion? ≤500, paymentMethod ∈ influencer.paymentMethods, duration ∈ allowed durations (≥ influencer's minimum booking) | server action `submitHireRequest(username, …)` |
| Campaign A | title (non-empty), budget >0, startDate, endDate ≥ start, deliverables, durationDays? int>0, minEngagementRate? (0/3/5/7?), ageRange? `^\d{2}[-–]\d{2}$`, location?, interests?, images (file input) | `saveCampaignDraft` / `createCampaign` |
| Campaign B | title 3–80, niche (known), budget 50,000–100,000,000 digits only, start ≥ today−1d, end ≥ start and ≤ 365 days, deliverables 10–1000, minEngagement ∈ any/3/5/7, ageRanges[], locations[], interests[] (all from option lists), referenceImageCount 0–5 | server action `submitCampaign` |
| Creator apply (3 steps) | §6 | `saveCreator*` then `submitCreatorApplication` |
| Fund campaign A | campaignTitle (from brand's campaigns list), influencerId, amount>0, method, payerPhone | `fundCampaign` |
| Fund campaign B | creatorId, campaign 3–80, amount 10k–50M, method, phone | `fundCampaignAction` |
| Creator respond | requestId, response, declineReason | `respondToCampaignRequest` |
| Request payout A | earningId | `requestPayout` |
| Cashout B | paymentId, summary 20–1500, links 1–5 URLs | `requestCashoutAction` |
| Withdraw | amount ≥1000 ≤ balance, method, phone | `withdrawFunds` / `withdrawAction` |
| Admin messaging | ids[], subject 3–120, body 10–2000 | `messageUsersAction` |
| Admin invite | name, email, role | `inviteTeamMemberAction` |
| New ticket | subject 5–120, message 10–2000, fromName 2–80, fromRole, priority | `createTicketAction` |
| Search bars | `q` (various pages) | URL params |

## 13. API / backend requirements (from `TODO` endpoints) [C]

Auth: `POST /api/auth/sign-up` (409 on dup), `POST /api/auth/sign-in` (401), `GET /api/auth/password-rules`; `GET /api/me/brand`, `/api/me/creator`.
Public: `GET /api/influencers?…`, `/api/influencers/search-options`, `/api/influencers/featured`, `/api/influencers/{username}`, `/api/campaign-durations?min=`, `POST /api/hire-requests`, `GET /api/platform/stats`, `/api/content/{about|for-brands|for-creators}`.
Creator application: `GET/PUT /api/creator-applications/draft[/basics|/audience|/rates]`, `GET /options`, `POST /api/creator-applications`, `GET /api/creator-applications/{id}`.
Campaigns: `GET /api/campaigns/{overview|preview|guide|engagement-rates|match-filters|form-options|guidance}`, `POST /api/campaigns/match-preview`, `GET /api/campaigns/reach?…`, `PUT /api/campaigns/drafts`, `GET|DELETE /api/campaigns/drafts/{id}`, `POST /api/campaigns/drafts/{id}/publish`, `POST /api/campaigns`, `GET /api/campaigns/{id}`, `GET /api/brand/campaigns`.
Brand payments: `GET/POST /api/brand/payments`, `/api/brand/payments/summary`, `/api/brand/influencers/hired`, `/api/escrow/steps[?for=creator]`.
Creator: `GET /api/creator/{workload|requests|decline-reasons}`, `POST /api/creator/requests/{id}/response`, `GET /api/creator/earnings/{summary|campaigns}`, `POST /api/creator/earnings/{id}/payout-request`, `GET/POST /api/creator/withdrawals`, `GET /api/creator/withdrawals/limits`, `GET /api/creator/payments`, `POST /api/creator/payments/{id}/cashout`, `GET /api/creator/wallet`.
Admin: `GET /api/admin/dashboard/{kpis|revenue}?range=`, `/api/admin/campaigns?sort=recent&limit=5`, `/api/admin/payments[?q,status]`, `/summary`, `/monthly?months=6`, `POST /api/admin/payments/{id}/release`, `GET /api/admin/users`, `/stats`, `/{id}`, `POST /api/admin/users/bulk`, `POST /api/admin/users/messages`, `GET /api/admin/{alerts|moderation|team|disputes|influencers/top}`, `POST /api/admin/team/invites`, `GET|POST /api/admin/tickets`, `/stats`. Not in TODOs but implied: flag toggle, dismiss alert, resolve moderation flag [C: functions exist without endpoint comments].

## 14. Authentication / session requirements

- Server-verifiable session (signed/opaque, httpOnly cookie), `remember` extending lifetime (demo uses 8 h fixed). Account `status === active` required to sign in. Role/area check on every protected page *and* every server action. Admin auth + RBAC by `TEAM_ROLES` (needed on all `/admin/*`, `/admin/export`). Password hashing, reset flow (link exists), login-failure tracking (the `failed-logins` security alert implies it) [A for the last].
- Open-redirect protection on `next` (regex above) must be preserved.
- The existing two-system split (A vs B) must collapse into one: sign-up/login (A) → cookie session (B) → role redirect.

## 15. Upload / storage requirements

- Creator profile photo: image ≤ 3 MB (currently inline base64 `photoDataUrl`).
- Campaign reference images: ≤ 5 files, image/*, ≤ 5 MB each (currently names/count only; code TODO: "upload them to storage once it exists").
- Compliance documents (`fileName`, kind, status) displayed for admin — **upload UI not present** [?].
- Influencer `imageUrl`: external Unsplash URLs; `next.config` allows only `images.unsplash.com` — new storage host needs allowlisting.

## 16. Payment requirements

- Methods: `MTN MoMo`, `Orange Money` (enum spelled two ways in code: `mtn_momo/orange_money` in A types & applications; `"MTN MoMo"/"Orange Money"` in B and hire form; hire form also shows "Bank transfer"). Normalize in DB.
- Phone: `^6\d{8}$` after stripping spaces/dashes/`+237`; stored formatted `6XX XXX XXX` in places.
- Escrow lifecycle: `held → requested (creator cashout + delivery report) → released (admin)`; release credits creator wallet with **net**; wallet available = Σ released net − withdrawals (processing + completed).
- **Fee 20%** (`PLATFORM_FEE_RATE`), `fee = Math.round(gross*0.2)`, `net = gross − fee` (fee rounded once). Impl. A shows full amount to creator with no fee [conflict].
- Limits: fund 10,000–50,000,000 (B); withdrawal min 1,000; campaign budget 50,000–100,000,000.
- Currency: CFA/FCFA/Frs (XAF), integer amounts.
- Backend must: collect mobile money payment on funding, trigger transfer on release/withdrawal, check balance and record withdrawal in one transaction, async withdrawal completion (`processing → completed`, "usually arrives within 24 hours"). Invoice numbers sequential (`INV-n`); references `ESC-YYYY-XXXX`.
- Refunds appear only as a wallet transaction kind and "refunded"; **no refund flow in UI** [?].
- Admin dashboard revenue = fees on **released** payments; pending revenue = fees on unreleased; escrow volume = gross unreleased [C].

## 17. Notification / messaging requirements

In-app notifications (`UserNotification`) generated by: account approve/reject/suspend/reactivate; admin message; payment funded (to creator), delivery report submitted (to brand), payment released (to creator and brand), withdrawal initiated (to creator), content removed. Copy strings are in the services. No UI for a user to *read* notifications was found (shown only on the admin user profile) [C/?]. Claimed but not implemented: "You'll be notified the moment one accepts" (campaign accepted), "Our team contacts you on your mobile" (application), "brand gets a polite auto-message when declined", email for team invites. No chat/messaging between brand and creator [C]. No reviews UI; "leave a rating & review once complete" is copy only; ratings exist only as aggregate numbers [C].

## 18. Search / filter / pagination

- **Influencers** (`/influencers`): `q` (accent-insensitive substring over name, username (leading `@` ignored), niche, location, categories); filters (repeatable params): `niche` (multi; fashion, fitness, business, beauty, music, sports; match on `categories`), `location` (multi; douala, yaounde, bamenda, buea; accent-stripped), `platform` (multi; followers>0), `language` (multi), `followers` (single; total across platforms: 0-50k, 50k-200k, 200k-1m, 1m+; ranges half-open), `budget` (single, on startingPrice: 0-500000, 500000-1000000, 1000000+), `success-rate` (single; 90, 75; ≥). Sorts: `recommended` (featured [rating ≥ 4.6] first, then rating, then successRate), `top-rated`, `newest` (joinedAt), `engagement`, `price-asc`, `price-desc`. Unknown query keys are treated as filter keys.
- Campaign reach/match: niche + locations + minEngagement; only verified & active & no conflicting deal; top 3 by engagement with `strong` ≥ 7.5%; broadening when primary location yields < 5 matches. Impl. A resolves niche from the first interest that equals a known niche (case-insensitive).
- Admin users: `q` (name/email), `type`, `status`, `location`, `niche`, `engagement` ∈ {0,2,4,6}; sort lastActive desc. Payments: `q` (invoice/campaign/brand/creator), `status`; sort fundedAt desc. Tickets: `q` (subject/name/number, `#` stripped), `status`; sort updatedAt desc. Dashboard: `range`.
- Brand/creator dashboards: client-side `q` filter.
- **No pagination anywhere** (all lists unbounded; only `limit` for top influencers/recent campaigns and 200-id bulk cap) [C]. Backend should add pagination [A].

## 19. Mock/static data to become DB data

`mock/influencers.mock` + `influencer-profiles.mock` (influencer & profile rows — ~dozens; includes the `INFLUENCERS` and per-id details); `influencer-filters.mock` (search options → lookup tables); `user-management.mock` (platform users, performance, trends, disputes, transactions, documents, notifications, alerts, flags, team); `payments.mock` (escrow payments, withdrawals, monthly stats — monthly stats should be computed, not stored [A]); `campaign-payments.mock`, `earnings.mock`, `creator.mock` (requests, workload max 2, decline reasons), `campaigns.mock` (matchable influencers, engagement options, overview/preview/guide copy), `direct-campaigns.mock` (form options, guidance), `creator-application.mock` (options and thresholds), `dashboard.mock` (revenue series, KPI previous-period, recent campaigns — should be computed), `support.mock` (tickets, current admin), `auth.mock` (demo accounts `hello@lumiere.cm`, `amara@influenceronhire.cm`; password min 8), `accounts.mock`, `hire-requests.mock` (durations 1 week/2 weeks/1 month/2 months/3+ months = 7/14/30/60/90 days), `platform.mock` (hard-coded "1,284+ Verified Influencers / 340+ Brands / 25M+ reach" — should be computed or CMS), `about`/`brands` content (CMS-like copy; may stay static [A]).
Hard-coded in code (not mocks): `MIN_WITHDRAWAL`, fee rate, fund limits, team roles, status enums, `FEATURED_MIN_RATING 4.6`, `STRONG_MATCH_ENGAGEMENT 7.5`, `MIN_MATCHES_PER_LOCATION 5`, `DEFAULT_RANGE 30d`.

## 20. Business rules

1. Fee 20% of gross, rounded once; net = gross − fee.
2. Escrow transitions strictly `held→requested→released`; only creator-owner may request; only admin may release; release requires `requested`.
3. Withdrawals ≥ 1,000 and ≤ available (re-checked server side).
4. Creator capacity: accept blocked at `maxActiveCampaigns`; only `pending` requests can be answered.
5. Account status machine (§8); only active accounts sign in or can be paid/fund (`getActiveAccount`; creators must be type influencer, brands type brand).
6. Matching: verified + active + no conflicting deal + niche/location/min engagement; reach estimates surfaced to brand.
7. Campaign new state = `pending_review`; flow Pending Review → Accepted → In Progress (A), admin reviews before it is sent [per copy; "goes to our team for a quick review"].
8. Minimum booking limits hire durations (day/week/month parsed: month=30d).
9. Creator application minimums: 1,000 total followers, ≥5,000 Frs per platform price, ≤3 collaborations, ≥1 payout account.
10. Featured influencer = rating ≥ 4.6. Top influencers ranked by lifetime earnings.
11. Brand never sees fee or creator net; creator sees split.
12. Hire request: no payment at request time; creator reviews first; funds in escrow before work.
13. Email unique case-insensitively; team member email unique.
14. Date rules for campaign B (≤365 days, no past start with 1-day leniency).
15. Notifications on status changes (§17).

## 21. Security considerations

- Demo session cookie holds a raw user id — forgeable; password store is plaintext in mocks.
- Several routes unguarded (`/brand/campaign-payments`, `/creator/requests`, `/creator/earnings`, all `/admin/*`, `/admin/export`, hire/campaign/ticket/user server actions). Server actions are directly POST-able (code acknowledges, re-validates input).
- Authorisation must be derived from session, never form fields (done for fund/cashout/withdraw).
- Row-level scoping required (brand→own payments; creator→own payments/wallet/requests).
- Cashout links limited to http(s) and ≤300 chars because they're rendered as clickable; CSV export neutralises `= + - @`.
- Open-redirect guard for `next`. Input length caps exist on most text fields; keep them DB-side.
- Concurrency: balance check + withdrawal insert and release must be transactional; double-release/duplicate funding protection; idempotency for mobile-money callbacks [A].
- Image upload: type and size limits are client-side only for campaigns/photo — must be enforced server-side [C: client-only today].
- Bulk admin actions capped at 200 ids; PII (phone, email, MoMo numbers) is partly masked in UI (`maskPhone`); audit logging not present [?].
- Terms acceptance is client-only; no consent record.

## 22. Ambiguities / undetermined

1. Which campaign model (A vs B) and which payment model (A vs B) is canonical; whether `/campaigns/new` or `/post-campaign` is the real entry (navbar "Post a Campaign" → `/campaigns` → `/campaigns/new`).
2. Who creates CampaignRequests, when (on admin approval of campaign or at post time), and how a brand picks among accepting creators ("Influencers submit their pricing, and you choose" in copy vs auto-matching "campaign sent to N verified influencers").
3. What accepting a request creates (a contract? hire? enables funding?) and how it relates to `HireRequest` — hire requests have no creator-side inbox or approve/reject UI.
4. Campaign states beyond `pending_review`; who moves them; `Accepted/In Progress` transitions not implemented. Dashboard campaign statuses differ (`draft|scheduled|in-progress|pending-review|completed|overdue`).
5. Campaign ↔ payment linkage (free text today); one payment per campaign or multiple creators per campaign.
6. Verified/active/conflicting-deal flags on creators: how computed (not in any creator type besides mock `MatchableInfluencer`).
7. Ratings/reviews: source and review submission flow (none); `avgReviewScore`, `rating`, `successRate` derivation.
8. How a submitted CreatorApplication becomes an influencer profile/username; admin application review UI is absent (users page shows "pending" accounts, but link to application data unclear).
9. Brand account profile fields beyond name (industry, location, logo); `location` for users includes Nairobi/Accra in mock though app targets Cameroon cities.
10. Dispute creation/resolution UI absent; refunds absent; withdrawal completion mechanism; support ticket replies/status changes absent; notifications read-state/UI; email/SMS delivery; "phone code" login.
11. Commission applies to hire requests identically? Fund minimums differ between A/B.
12. Admin "Campaigns", "Disputes", "Reports" modules and "My Creator Profile", "Browse Influencers" (brand), Terms/Privacy/Escrow Policy, Help & Support, Services pages are placeholders.
13. i18n: copy is English only although language filter includes French/Bilingual [?].
14. Data retention for drafts (anonymous vs per-user) and draft expiry.
15. `activity` text ("Active this week") likely derived from last-active timestamp [A].
