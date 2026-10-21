# Canonical Business Model — Influencer On Hire

Companion to `FRONTEND_FLOW_ANALYSIS.md` (referred to as **FFA**; moved on 2026-10-21 to `../../influencer-onhire-web-application/docs/FRONTEND_FLOW_ANALYSIS.md`). Resolves the Version A / Version B conflicts before any schema work. No SQL, no backend, no frontend changes.

Tags: **[C]** confirmed in frontend source/UI · **[T]** supported by an API `TODO` comment · **[D]** decision made here (with rationale) · **[P]** needs product approval (also listed in §17).
"Canonical" means: the model the backend implements. Frontend screens that disagree must be adapted to it later (§16).

Terminology [D]: **Creator** is the user-facing term (UI, routes `/creator`). **Influencer** is a synonym used in data/URLs (`/influencers/[username]`). Canonical role name: `creator`. (Version B's `influencer` role value and Version A's `creator` value are the same role.)

---

## 1. Canonical authentication model

**Decision [D]: one email+password credential system (Version A's sign-up/login forms) feeding one server-verified cookie session (Version B's session mechanism, hardened).** The demo account picker at `/sign-in` is removed.

Why: A is the only flow with real credentials (email, phone, password rules, duplicate-email handling, `remember`, 409/401 contract [T]); B is the only flow that has a session, role guards, `next` redirect handling and `requireAccount` on actions [C]. Neither alone is a complete auth system; they are complementary.

Rules:
1. **Sign-up** `POST /api/auth/sign-up` [T]: `accountType` (`brand|creator`), `fullName` (business name for brands), `email`, `phone`, `password`. Email unique case-insensitively (trimmed, lower-cased); duplicate → 409. Phone: Cameroon mobile, 9 digits starting with 6, `+237` optional; stored normalised. Password: min length from `GET /api/auth/password-rules` (8) + at least one letter and one digit. Terms acceptance is required [C] and the backend records that it was accepted and when [D — frontend only checks a box; recording it is a backend security fix, not a feature].
2. **Session**: server-issued opaque/signed token in an httpOnly, sameSite=lax, secure cookie; never an account id. `remember=true` → long-lived (frontend default is checked), `false` → session/short lifetime [T: "remember controls the session cookie's lifetime"]. The demo cookie's fixed 8 h is the short value [D].
3. **Sign-up creates a session** [D]: A's sign-up redirected into authenticated areas (brand → `/campaigns/new`, creator → `/for-creators/apply/profile`) without any session, which is impossible to honour with real guards. So sign-up logs the user in. Creators sign up first and then apply, which matches the A redirect.
4. **Login** `POST /api/auth/sign-in` [T]: wrong credentials → 401 generic message [C]. **Account status gates login** [C]: `active` and, per [D], also `pending` for **creators with a submitted/draft application** and brands (see below) — otherwise a new creator could never reach the application wizard. Suspended and rejected accounts cannot log in [C: B's "only active accounts can sign in; pending, suspended, rejected are turned away"].
   - Conflict: B says `pending` cannot sign in; A's flow requires a just-registered creator to continue straight into the application. **Resolution [D]**: separate *login eligibility* from *capabilities*. `pending` accounts may log in but have a restricted capability set (creator: complete/track application only; cannot receive requests or payments). `suspended` and `rejected` cannot log in. **[P]** confirm whether brands also start `pending` (needing approval) or `active` (see §2).
5. **Post-login redirects** [C]: brand → `/brand/payments`, creator → `/creator/requests` (A) — B's default `/<area>/payments` is the fallback only when `next` is valid. `next` must match `^/(brand|creator)/[a-z-]+$` and stay inside the user's own area [C].
6. **Sign-out** invalidates the session server-side.
7. **Authorization on every protected page and every server action/API call** [C pattern from B; FFA §21 gap]: `/brand/*`, `/creator/*`, `/admin/*`, `/admin/export`, and every mutation. Role mismatch → denied (`/sign-in?denied=<area>`).
8. Password reset: the "Forgot password?" link exists (placeholder) [C]; a reset flow is a **security necessity of any password system** but is a feature the frontend lacks → listed [P].
9. Security signals: the admin `failed-logins` alert implies login-failure tracking [C]; backend records failed attempts and raises the alert (`SecurityAlert`, §9).

## 2. Canonical user / role model

**One `User` identity with one primary role; role-specific profile data hangs off it.** [D]

Roles [C]: `brand`, `creator`, `admin`. Admin staff are **users** too (the frontend models `TeamMember` with name/email/role/status separately, but staff must authenticate, so they are users with role `admin` plus a team role) [D].

- **Account status** (single enum for all roles) [C B]: `pending`, `active`, `suspended`, `rejected`. Meaning:
  - `pending`: awaiting admin approval (creator application under review; brand per [P]).
  - `active`: full capabilities.
  - `suspended`: blocked; reversible by `reactivate`.
  - `rejected`: application refused; reversible by `reactivate` [C: reactivate from suspended or rejected].
- **Admin team roles** [C]: `Super Admin`, `Campaign Manager`, `Finance`, `Support Agent`. Admin team member status: `invited | active` [C].
  - Permissions: the only explicit rule in the frontend is *release payout → Super Admin and Finance* [C: TODO comment]. Everything else is unspecified. Proposed minimal mapping, flagged for approval **[P]**: Super Admin = everything incl. team invites; Finance = payments (view + release); Support Agent = tickets + read-only users; Campaign Manager = users approval + campaigns (the Campaigns nav item is unbuilt). Do **not** implement beyond what is approved; default for unapproved areas = Super Admin only [D].
- **Brand** profile data [C]: name (the sign-up "business name"), industry (shown as `niche` in admin), location, phone, email. Account label "Brand Account", initials derived [C].
- **Creator** profile: see §3.
- **Unified naming/ID [D]**: a single user id used everywhere. All the Version A ad-hoc ids (`brand-lumiere`, `inf-amara`, `usr-*`) and B's `u-101` collapse into this; payments, campaigns, requests and notifications refer to it (relational identity requirement).
- **Derived flags used by matching** [C, mock `MatchableInfluencer`]: `verified` (= creator `active` and application approved; admin `compliance` is a separate document verification state — see below), `active` (account status + recent activity), `hasConflictingDeal` (see §5). 
- **Compliance** [C]: `verified | in-review | missing` is an admin-visible status derived from the user's compliance documents (§9). It is **not** the same as account approval. [D]: matching uses account `active` AND application-approved; compliance status is informational unless **[P]** decides it must be `verified` before payouts.
- **Flagged** [C]: admin boolean on a user ("flag for review"); independent of status.
- Last-active timestamp [C]: required for admin sorting and the "Active this week" text.

## 3. Canonical creator application / profile model

**The application is the creator's onboarding record and, once approved, becomes the public creator profile.** There is one underlying creator profile; the application's data is that profile's data — not two copies. [D]

Evidence: the wizard collects exactly the fields that the public profile displays (bio, niche, city, platforms/followers, collaborations, brand fit, per-platform pricing, minimum booking, deliverables/revisions/usage rights/deposit terms) [C]. Public profile `contractTerms[]` is the list form of those same four term fields [D mapping]; `startingPrice` = min platform price [C: code comment says it is derived so card and detail never disagree].

Lifecycle [C+D]:
1. Creator signs up (§1) → account `pending`, no application yet.
2. Wizard step data saved as a **per-creator draft** (FFA noted the mock draft is global — must be per user) [D]. Steps: profile → audience → rates; step 3 requires step 2 to exist [C].
3. Submit → application status `under_review` [C]; account stays `pending`.
4. Admin approval (`approve`: `pending → active`) [C] → profile becomes public/searchable; the user gets "Your account has been approved" notification [C].
5. Admin `reject` (`pending → rejected`) → notification; the creator can be `reactivate`d [C].
   - Application statuses actually seen: only `under_review` [C]. Canonical set [D]: `draft`, `under_review`, `approved`, `rejected`. `approved/rejected` are simply the application-side mirror of the account transition (the admin UI acts on **accounts**, not on application objects — there is no application review UI [C]; the admin reviews it through the pending user and `/admin/users/[id]`). **[P]** whether a dedicated application review screen/edit-request is wanted — not invented here.
6. Resubmission after rejection: undetermined **[P]**.

Creator profile data (what must exist) [C]:
- Identity: display name, **username** (public URL slug, unique — e.g. `francis.ngannou`; the wizard has no username field, so the backend generates it from the display name [D, because the public URL needs it]), photo, niche, city/location, language (`English|French|Bilingual` — shown on cards/filter but **not collected by the wizard**: gap **[P]**), bio, content style (shown on profile, **not collected**: gap **[P]**).
- Categories slugs used by search filters (`fashion, fitness, business, beauty, music, sports`) vs wizard niches (`Beauty, Fashion, Lifestyle, Sports & Fitness, Food, Tech, Travel, Music, Comedy`) and campaign filters — **three differing niche vocabularies** [C]. [D]: one controlled niche list; the search "categories" are a multi-valued tag set per creator drawn from it; the wizard's single "niche" is the creator's primary niche. The final list **[P]** (union of the three is the safe superset).
- Cities: wizard (Douala, Yaoundé, Bamenda, Buea, Bafoussam, Garoua, Kribi) vs search filter (first four only) [C]. [D]: wizard list is canonical (superset); search filter options derive from cities that have creators.
- Social accounts (≥1 of facebook/instagram/tiktok/youtube) each with handle + follower count; total followers ≥ 1,000 [C]. Follower counts are self-reported at application time; admin "follower-spike" alert implies later tracking [C] → the backend stores the self-reported number with a timestamp; automated refresh is **not** assumed **[P]**.
- Rate card: price per platform, minimum 5,000 Frs [C]. "Starting price" derived.
- Terms: minimum booking (1 week / 2 weeks / 1 month), deliverables text, revisions, usage rights, deposit terms [C].
- Past collaborations (≤3 at apply; brand, description, year; the public page also shows a `campaign` title [C] — same concept, `description` ≙ `campaign`) [D].
- Brand-fit tags.
- Payout accounts (MTN MoMo and/or Orange Money, number) [C] — **creator's own withdrawal destinations**, see §8. Public profile also shows "payment methods accepted" (`MTN MoMo`, `Orange Money`, plus `Bank transfer` in mock) [C]. [D]: accepted methods shown to brands = the creator's configured payout methods; `Bank transfer` is **removed** (no bank flow exists anywhere else; the platform pays only via mobile money, FFA §16).
- Performance aggregates shown publicly: rating, successRate, engagementRate [C]. **Engagement rate** has no source in the wizard (not collected) → **[P]** (self-reported vs computed).
- `joinedAt` (approval/registration time) for the "Newest" sort [C].
- Photo: see §12.

Published-profile gating [D]: only creators with account `active` appear in `/influencers`, featured lists, and matching.

## 4. Canonical campaign model

**Decision [D]: Version B's campaign (select-based, structured targeting, server-validated) is canonical for fields and validation; Version A's draft/preview/publish workflow and matching preview are preserved as functionality because they do not conflict.**

Why: B has authoritative validation (3–80 title, 50k–100M budget, ≤365 days, controlled option lists, reach estimate) and a stable reference; A has useful unique features (drafts, preview, "posted" confirmation, match summary with top matches / broadening). A's free-text `location`/`interests`/`ageRange` strings are less queryable than B's option lists.

Canonical Campaign fields:
- Owner: **brand user** (required — both versions lack this; backend requires authentication) [D].
- `title` (3–80), `niche` (single, from controlled list), `budget` (integer XAF, 50,000–100,000,000), `startDate`, `endDate` (start ≥ today with 1-day tz leniency; end ≥ start; span ≤ 365 days inclusive), `deliverables` (10–1000 chars).
- Targeting (all optional): `minEngagement` ∈ {any,3,5,7} (B) — A's option set {0,1,2,3,5,8} conflicts; [D] use B's, because B is validated server-side and A's options are only mock data; **[P]** final thresholds. `ageRanges[]` ∈ {18–24, 25–34, 35–44, 45+}, `locations[]` (cities), `interests[]` ∈ list. A's `durationDays` ("Or number of days") is **dropped as an input**: duration is derived from start/end [D]; the creator request's `durationDays` [C] is that derived value.
- Reference images ≤5, see §12.
- `reference` human code `CMP-XXXXXX` [C]; internal id separate.
- `createdAt`, `status`.

Campaign status [C+D]. Evidence is inconsistent: A: `pending_review|accepted|in_progress`; B: `pending_review` (+ lifecycle UI "Pending Review → Accepted → In Progress"); admin dashboard: `draft|scheduled|in-progress|pending-review|completed|overdue`. Canonical set:
- `draft` — saved but not submitted (A drafts) [C].
- `pending_review` — submitted, awaiting admin review [C].
- `accepted` — **at least one creator has accepted** a request (UI lifecycle step 2) [C].
- `in_progress` — escrow funded and work underway [C, UI "In Progress"; see rule below].
- `completed` — all delivery done / payments released [C dashboard].
- `overdue` — **derived**: past `endDate` and not completed (dashboard) [D: derived, not stored].
- `scheduled` (dashboard) — **dropped as a stored state**: it is "approved/accepted, startDate in the future", derivable [D].
- `cancelled`/`rejected` by admin — not in the frontend; **[P]** (a review step with only approve implies a reject outcome).

Transitions [D from copy]: draft → pending_review (brand submit / publish); pending_review → (admin review, outcome **[P]**) → open to matching; first creator accepts → accepted; funds in escrow & work started → in_progress; all payments released → completed.

**Drafts** (A): per-brand; fields as the campaign; saved by the preview step; deleted on publish [C]. Preview page shows the draft plus brand name and match summary [C]. B's direct submit (no preview) is allowed as the same operation as "publish a draft in one step" [D].

**Matching** (both versions) [C]: eligible = creator `active`, verified (application-approved), no conflicting deal, engagement ≥ min, niche match, location match (any selected). Results: `matchedCount`, top-3 by engagement (`strong` ≥ 7.5%, else `good`), broadening when the primary location has < 5 matches [C A]. Used for (a) live reach estimate, (b) post-submit "sent to N influencers", (c) generating requests (§5). **"Conflicting deal"** [C flag, undefined]: **[P]** — recommended interpretation: creator already at their active-campaign cap (§5) or an overlapping accepted campaign in the same niche — not decided.

Campaign ↔ payments: a payment must reference a **campaign and a creator** (relational), see §6.

## 5. Canonical hiring / application / request model

Three constructs exist in the frontend and are **not the same thing**; each is kept but given an explicit identity [D]:

1. **Direct Hire Request** (`/influencers/[username]/hire`, B-style server action) — brand → one specific creator, initiated from the creator's profile. Fields: brand (from session — was a free-text `fullName`), `location`, optional social handle, optional promotion description (≤500), chosen payment method, chosen duration. Status `pending` [C].
2. **Campaign Request** (`/creator/requests`) — platform → creator invitation produced by matching a posted campaign. Statuses `pending|accepted|declined` [C].
3. **Campaign** (broadcast) — §4.

Decision: **both 1 and 2 are "offers from a brand to a creator" and share one underlying concept: an `Engagement`-style relation between (brand, creator, optional campaign)** [D], because the creator-side decision (accept/decline), the escrow funding step, and the delivery step are identical downstream, and payments need a single relational anchor ("no free-text relationships"). Differences:
- Origin: `direct_hire` (brand picked the creator; no campaign necessarily) vs `campaign_match` (system matched a campaign).
- A direct hire carries brand-entered `duration` + `promotion` and no budget (price from the creator's rate card [A: not shown in the form; **[P]** how the price is determined]); a campaign request carries campaign `budget`, `durationDays`, deliverables.

I describe this as "the **Engagement**" in prose only; table design comes later.

Canonical request/engagement status [C+D]: `pending` → `accepted` | `declined`. Further states exist implicitly: `accepted` → (funded) → `in_progress` → `delivered` (cashout requested) → `completed` (payment released). [D]: these downstream states are **not stored separately**; they are derived from the engagement's escrow payment status (§6) so there is exactly one source of truth. Also: `expired`/`cancelled` are not in the frontend → [P].

Hire request details:
- Brand identity from session; the form's `fullName`/`location` become brand profile data defaults, not per-request free text? The form collects them per request [C]. [D]: keep as request-level contact fields **plus** link to the authenticated brand (the free-text-only approach is rejected).
- `reference` `HR-XXXXXX` [C].
- Allowed durations = durations ≥ the creator's `minimumBooking` where month=30 days (1 week 7, 2 weeks 14, 1 month 30, 2 months 60, 3+ months 90) [C].
- `paymentMethod` must be one of the creator's accepted methods [C] (= creator payout methods, §3).
- Hire submission **requires a signed-in brand** (frontend TODO) [C]; currently the form is public → this is a gap to fix, so unauthenticated visitors are redirected to sign-in/sign-up first [D].
- **Creator side**: there is no UI for creators to see/answer hire requests [C]. The copy states "no payment is taken now; the influencer reviews your request first, and payment is held in escrow until delivery" [C]. [D]: the creator responds through the same pending → accepted/declined mechanism as campaign requests, shown in the same inbox. **This is an implied (not existing) screen** → flagged **[P]**; the backend models it, the screen is out of scope until approved.

Campaign request rules [C]:
- Generated for each matched creator when the campaign becomes open (after review) [D; timing **[P]**].
- Shown fields: campaign title, brand name, niche, city, budget, duration, deliverables summary, match reasons (derived at match time: niche, city, engagement vs threshold) [C].
- Respond: only `pending` can be answered; accepting is **blocked if creator's active campaigns ≥ max** (mock 2) [C]; declining needs a reason from a controlled list (`Schedule conflict`, `Budget doesn't match my rates`, `Not a fit for my audience`, `Other`) [C]. `respondedAt` recorded.
- "If declined, we'll suggest other matching influencers automatically" [C copy] → backend re-matches; no new UI.
- Whether the **budget** is per-creator or shared among several accepting creators: A copy says "targeted influencers submit their pricing, and you choose" (A overview) vs B/creator-side "budget" shown on the request and accept immediately [C]. [D]: follow the actually implemented creator UI — the request shows a fixed `budget`; accepting commits the creator at that budget. **[P]** how a campaign budget splits across multiple accepting creators.
- Max active campaigns per creator = `maxActiveCampaigns` (mock 2) is a platform setting, not per-creator data, unless **[P]**.
- "Active campaign" count = accepted engagements not yet completed [D].

## 6. Canonical escrow / payment model

**Decision [D]: Version B's `EscrowPayment` model is canonical, with A's richer fields merged in.** Reasons: B has the full lifecycle (fund, cashout request with a delivery report, admin release), the 20% fee split, role-specific views, atomic wallet math and notifications; A's escrow is the same lifecycle with the fee missing and is purely creator/brand display.

Canonical Escrow Payment:
- Relational identity [D]: **brand (user)**, **creator (user)**, **engagement/campaign** — never free text. A's UI picking `campaignTitle` from the brand's campaigns list (with free-text input allowed) and B's `campaign` string both become a **selection of an existing campaign or hire engagement that the creator has accepted**. Funding without an accepted engagement is disallowed [D]: the frontend's copy says "no charge until an influencer accepts and funds are placed in escrow" [C].
- Amounts: `gross` = what the brand pays (integer XAF); `fee = round(gross × 0.20)`, `net = gross − fee` (rounded once), computed and **stored at funding time** so later rate changes do not rewrite history [D; frontend only computes on the fly].
  - A showed the creator the full amount as "earned" with no fee [C]. **Resolved: the fee applies** (B), and creator screens show `net` as take-home with the split visible [C B]. Brand never sees fee/net [C].
  - Funding amount: B limits 10,000–50,000,000; A only >0. [D] use B. Relation to campaign budget: amount may equal the creator's share of the budget; no frontend enforcement **[P]**.
- Payer: brand's payment `method` (`mtn_momo|orange_money`) and **payer phone** (A collects `payerPhone`; B collects `phone` but doesn't persist it) [C]. [D]: persist payer phone and method (needed to collect the mobile-money payment [T: "backend collects the mobile money payment first"]).
- Identifiers: `invoice` `INV-<n>` sequential (B) and `reference` `ESC-YYYY-xxxx` (A) → [D] keep both as display identifiers; invoice for admin/brand/creator tables, `ESC` ref shown in A's dashboards; they should refer to the same record. **[P]** whether to keep both.
- Status (canonical) [D]: `held → requested → released`. Names from B; A's `on_hold`/`payout_requested` are the same states. Display labels: "On hold (escrow)", "Payout requested", "Released" [C].
- Timestamps: `fundedAt`, `requestedAt`, `releasedAt` [C].
- **Payment collection state**: the frontend assumes funding succeeds instantly (mock) and that "backend collects the mobile money payment first" [T]. A real flow needs a pre-`held` state (initiated/pending provider confirmation, failed). That is an infrastructure necessity, not a product feature [D]: a payment becomes `held` only after the provider confirms collection. Internal provider-status naming is deferred to design; **[P]** which provider/aggregator.
- **Delivery report** (B): `summary` (20–1500 chars), `links` (1–5 http/https URLs ≤300 chars), `submittedAt` — created with the cashout request, one per payment; visible to brand, creator, admin [C]. A's `deliverables[]` list on a payment (e.g. "1 Instagram story") = the agreed deliverables of the campaign/engagement, not a payment attribute → comes from the engagement (§4/§5) [D].
- Rules [C]:
  1. Fund creates `held`; creator notified ("Payment on hold for you").
  2. Only the creator on the payment can request cashout, and only from `held`; sets `requested` + report; brand notified.
  3. Only an admin with Finance/Super Admin can release, and only from `requested`; sets `released`; credits the creator wallet with **net**; notifies creator and brand.
  4. Illegal transitions are no-ops/errors; no skipping states; releases are idempotent.
  5. Eligible parties: brand must be `active` brand; creator `active` creator [C].
- **Platform revenue accounting** [C]: revenue = fee on `released`; pending revenue = fee on unreleased; "held in escrow" = gross of unreleased; payout requests = count of `requested`.
- **Refunds/disputes**: wallet transaction kind `refunded` and `Dispute` entity exist in admin views, but no refund action exists [C]. [D]: model the data (dispute record; `refunded` as a ledger entry) but **do not create refund behaviour** until **[P]**.
- The two brand payment pages (`/brand/campaign-payments` A and `/brand/payments` B) become one (§16).

## 7. Canonical creator earnings / wallet model

**Decision [D]: the wallet is a ledger-derived balance (B), not a stored mutable number (A's `MOCK_CREATOR_BALANCE {available, lifetimeEarned}`).**

Why: A's balance is a hard-coded pair that can drift from payments; B derives `available = Σ released net − withdrawals (processing + completed)`, which stays consistent with escrow and prevents overdraw.

Definitions (all in XAF, all derived from escrow payments + withdrawals):
- `inEscrow` (creator view, "On hold") = Σ net of `held` payments.
- `awaitingRelease` / "pending payout" = Σ net of `requested` payments.
- `released` = Σ net of `released` payments (credited to the wallet).
- `totalEarned` = Σ net of **released** (A's "lifetimeEarned") [C]. FFA noted B's `totalEarnings` sums all statuses; [D] "total earnings" in the UI = net across all (held+requested+released) in B's payments page but "total earned" in A's earnings page = released only. Use two named figures: **earned (released)** and **total committed (all statuses)** — the UI labels decide which to show; both derivable.
- `available` = released − processing − completed withdrawals (never negative; enforced transactionally).
- `processing` = Σ processing withdrawals; `withdrawn` = Σ completed withdrawals.
- Admin user views show `wallet {available, inEscrow}` for **both** brands and creators [C]. For creators = the above. For brands, `inEscrow` = gross held on their behalf and `available` has no defined meaning (brands don't hold balances) → [D] brand "wallet" is just their escrow totals; **no brand balance/deposit wallet is modelled** (the `deposit` transaction kind is a funding event, not a balance top-up) **[P]**.
- Wallet transaction history (admin profile) [C]: kinds `escrow-held`, `released`, `refunded`, `withdrawal`, `deposit`, each with description, amount, date → derived from escrow payment and withdrawal events (an append-only record). `refunded` unused until [P].
- A's per-campaign `requestPayout(earningId)` and B's `requestCashout(paymentId, report)` are the same step; the canonical one is B's (requires the report). A's payout request without a report is **removed** [D] since the report is the evidence admin reviews and brand reads.

## 8. Canonical withdrawal model

**Canonical: B's `Withdrawal`** (creator-scoped, balance-checked, processing → completed), with A's fields mapped in.

- Fields [C]: creator, `amount`, `method` (`mtn_momo|orange_money`), destination `phone` (9-digit 6xxxxxxxx), `status`, `requestedAt`, `completedAt`. A's `date` = `requestedAt`.
- Validation [C]: amount ≥ 1,000 XAF and ≤ available balance (checked **server-side inside the same transaction that records the withdrawal**, because the form can be stale) [T]; method required; phone `^6\d{8}$`.
- Limits come from the server (`GET /api/creator/withdrawals/limits`) [T] — the minimum is a platform setting.
- Destination: free entry in the form [C], prefilled/choose-from the creator's saved payout accounts [D: the wizard collects payout accounts; using them is consistent]. Whether a withdrawal to a number not saved on the profile is allowed: **[P]**; the admin `payout-change` security alert [C] implies changes to payout destinations are monitored → log them.
- Status: `processing → completed` [C]. `failed` is not in the frontend but a mobile-money transfer can fail; a failed withdrawal must return funds to `available` (derivation handles it if failed rows aren't counted) [D, correctness necessity] — name TBD in design. Who/what moves `processing → completed`: the provider callback or an admin; the frontend shows no admin action for it [C] → [D] system-driven by provider confirmation; **[P]** confirm no manual admin completion.
- Notification at request: "Withdrawal on its way… usually arrives within 24 hours" [C].
- The creator's withdrawal list is sorted newest first [C]. Both versions' pages show it.

## 9. Canonical admin model

Single admin area `/admin/*` (only one version exists) [C]. Backend requirements:
- **Authentication + RBAC on everything**, including `/admin/export` (CSV) — currently open (FFA §21) [D].
- **Dashboard**: KPIs for ranges `7d|30d|90d` (default 30d): active campaigns (current vs previous period), platform revenue (current vs previous), in escrow, payout requests, open tickets, urgent tickets; revenue series; 5 recent campaigns; attention items; top influencers (by earnings); CSV export. **All computed from real data** [D]: the mock's `previousRevenue`, `MOCK_PERIOD_KPIS` and monthly stats are fake aggregates — no stored KPI tables. Revenue = fees on payments **released** in the period; "active campaigns" = campaigns in `accepted`/`in_progress` [D].
- **Recent campaigns table** uses `delivered / influencers` counts [C]: influencers = accepted engagements on the campaign; delivered = those with a delivery report submitted/released [D].
- **User management**: list/filter (`q`, type, status, location, niche, min engagement ∈ {0,2,4,6}), stats, bulk actions with the exact transition table (§13/§14), per-action notification, message to users, flag/unflag, user profile with performance/trend/disputes/transactions/documents/notifications. Performance and trends are **derived** (completed campaigns, success rate, average review score, monthly series) [D]. Bulk cap 200.
- **Security alerts**: kinds `failed-logins`, `follower-spike`, `payout-change`; severity `high|medium`; raised by the backend from login/follower/payout events [T]; dismissible → permanent removal in the mock; canonical: mark dismissed (keep an audit record, never hard-delete) [D — audit is a security requirement].
- **Moderation**: reports with `field` (`bio|campaign-description|media`), excerpt, reason; actions `remove` (content actually removed + user notified) / `dismiss`. Who creates the reports (user report UI, automated) is unknown [C: no report-content UI] → **[P]**. Same "resolve rather than delete" rule [D].
- **Payments**: ledger with search & status filter, release action, monthly analytics (computed).
- **Support**: tickets created **by an admin on behalf of** an influencer or brand (name + role strings) [C]; canonical: the requester is a real user reference (optional only if the ticket is about a non-user) [D]. Ticket fields as in FFA; number sequential; status `open|in-progress|resolved`; priority `urgent|normal|low`. Stats: open (= unresolved), urgent (unresolved), resolved this week, average first-response hours. **No reply / assign / status-change UI exists** [C] but `firstResponseMinutes` and `resolvedAt` imply them → **[P]**. Whether users can open tickets themselves ("Help & Support" is a placeholder) **[P]**.
- **Team**: list, invite (name, email, role; duplicate email rejected; status `invited`; the endpoint sends the invite email [T]). Accepting an invitation (set password) is implied and unspecified → part of auth design, **[P]** flow.
- **Compliance documents**: `contract`, `tax-id`, `business-registration`, `national-id` with status `verified|in-review|rejected`, shown read-only in admin [C]; no upload or review UI → **[P]**.
- **Disputes**: `open | resolved-in-favour | resolved-against` with campaign + reason + openedAt, attached to a user [C]; only the open count is surfaced to admins; no create/resolve UI → modelled, not exposed **[P]**.
- Unbuilt admin modules (Campaigns review, Disputes, Reports) [C]: the backend must still provide **campaign review** because the whole campaign lifecycle depends on `pending_review` (§4); the screen is a missing frontend piece → **[P]**.
- Audit logging for every admin mutation (approve/reject/suspend, release, message, flag, invite) — not in the frontend but required by the security findings [D].

## 10. Canonical notification model

**Decision [D]: one `Notification` concept = in-app notification addressed to one user (Version B's `UserNotification`)**, created by system events and by admin messages.

- Fields [C]: recipient, title, body, sentAt. Add read state because inbox-style notifications need it **[P]** (no read/unread UI exists; not invented).
- Admin "message users" = the same notification, sent in bulk (subject→title, body) [C].
- Event catalogue (exact copy templates exist in the frontend) [C]:
  | Event | Recipient | Title |
  |---|---|---|
  | Account approved / rejected / suspended / reactivated | affected user | "Your account has been approved" / "Application update" / "Your account has been suspended" / "Your account is active again" |
  | Content removed (moderation) | owner | "Content removed" |
  | Escrow funded | creator | "Payment on hold for you" |
  | Delivery report submitted | brand | "Delivery report submitted" |
  | Payment released | creator and brand | "Payment released" / "Payment released to creator" |
  | Withdrawal requested | creator | "Withdrawal on its way" |
- **Promised in UI copy but not implemented** [C]: "You'll be notified the moment one accepts" (campaign request accepted → brand), campaign request received (→ creator), hire request received/answered, application received/team contacts you, auto-message on decline. [D]: these are **backend-required notifications because the copy promises them**: request received → creator, request accepted/declined → brand, campaign approved. Hire-request creator notification included.
- Delivery channel: in-app only is evidenced. Email/SMS: invite email [T], "contacts you on the mobile number" [C copy]. **[P]** channels.
- Persistence: notifications are history; never deleted.
- No brand↔creator chat exists [C]; none modelled.

## 11. Canonical review / rating model

Evidence [C]: aggregates only — `rating` (0–5, used for "top rated" and featured ≥ 4.6), `successRate` %, `avgReviewScore`, `reviewCount`, `campaignSuccessRate`, `campaignsCompleted`. Copy: "Leave a rating & review once the campaign is complete" (brand → creator) [C]. No submission UI, no review text anywhere.

Decision [D]:
- Canonical model = **a review is written by a brand about a creator, tied to one completed engagement (released payment)**, with a numeric score (and optional text — not evidenced, **[P]**). Only brands review creators; creators reviewing brands is not evidenced → excluded.
- `rating` on the creator = average of review scores; `reviewCount` = number of reviews; **both derived, never edited manually**.
- `successRate` = share of the creator's accepted engagements that ended `released` (delivered & paid) rather than abandoned/disputed [D — definition is an inference; **[P]** exact definition]. `campaignSuccessRate` in admin profile is the same metric.
- For brands, `avgReviewScore`/`reviewCount` in admin performance are shown as 0 for brands in mock; no brand-rating concept [C weakly] → not modelled.
- The review-submission screen does not exist; the backend should support it only after **[P]**; the aggregates must be computable meanwhile (empty → default display).
- Admin moderation can remove content but nothing shows moderating reviews.

## 12. Canonical media / upload model

- **Creator profile photo**: image, optional, ≤ 3 MB, JPG/PNG (UI text: "JPG or PNG"; code accepts any `image/*`) [C]. Currently base64 data URL held in the draft → [D] stored as a file in object storage; the profile stores a reference/URL. Validation (type, size, content sniffing) enforced **server-side** (currently client only).
- **Campaign reference images**: ≤ 5 per campaign, `image/*`, ≤ 5 MB each [C]. Today only count/filenames travel (B: count; A: names) → [D] real file upload linked to the campaign (or draft; carried over on publish — A draft stores names to "still attach" them [C]). Canonical A+B merge: images belong to the campaign/draft; publishing keeps them.
- **Compliance documents**: stored files with kind, file name, uploaded timestamp, status [C display]; upload path unspecified → **[P]**.
- **Influencer card images**: `imageUrl` (Unsplash in mock) → the creator profile photo is the source [D]; `next.config` remote host allow-list must include the storage/CDN host (frontend change later).
- **Delivery report evidence**: links only (no file uploads) [C] — do not add file uploads.
- Security: access control for non-public files (documents, campaign images before posting), content-type allow-list, size limits, virus/format checks **[D requirement]**; public files (profile photos) are world-readable only for approved profiles.
- Moderation `media` flag field exists [C] → media must be individually removable.

## 13. Canonical statuses / enums

| Concept | Canonical values | Source / note |
|---|---|---|
| Account role | `brand`, `creator`, `admin` | `influencer` (B) ≡ `creator` (A) |
| Account status | `pending`, `active`, `suspended`, `rejected` | B |
| Admin team role | `Super Admin`, `Campaign Manager`, `Finance`, `Support Agent` | C |
| Team member status | `invited`, `active` | C |
| Application status | `draft`, `under_review`, `approved`, `rejected` | `under_review` C; others D (mirror of account transitions) |
| Compliance status (user) | `verified`, `in-review`, `missing` | C |
| Document status | `verified`, `in-review`, `rejected` | C |
| Document kind | `contract`, `tax-id`, `business-registration`, `national-id` | C |
| Social platform | `facebook`, `instagram`, `tiktok`, `youtube` | C |
| Payment method | `mtn_momo`, `orange_money` (display "MTN MoMo", "Orange Money"). `Bank transfer` removed | A form vs B display; storage uses snake_case, display mapped |
| Campaign status | `draft`, `pending_review`, `accepted`, `in_progress`, `completed` (+ derived `overdue`, `scheduled`); `cancelled/rejected` [P] | §4 |
| Request/engagement status | `pending`, `accepted`, `declined` (+ [P] `expired/cancelled`) | C |
| Request origin | `campaign_match`, `direct_hire` | D |
| Escrow status | `held`, `requested`, `released` (+ pre-hold collection state, internal) | B |
| Withdrawal status | `processing`, `completed` (+ failure state, internal) | C + D |
| Wallet txn kind | `escrow-held`, `released`, `refunded`, `withdrawal`, `deposit` | C |
| Notification | no status; (+ read flag [P]) | |
| Ticket status | `open`, `in-progress`, `resolved` | C |
| Ticket priority | `urgent`, `normal`, `low` | C |
| Ticket requester role | `influencer`→`creator`, `brand` | C normalised |
| Dispute status | `open`, `resolved-in-favour`, `resolved-against` | C |
| Alert kind / severity | `failed-logins`, `follower-spike`, `payout-change` / `high`, `medium` (+ dismissed) | C |
| Moderation field / decision | `bio`, `campaign-description`, `media` / `remove`, `dismiss` | C |
| Bulk user action | `approve`, `reject`, `suspend`, `reactivate` | C |
| Language | `English`, `French`, `Bilingual` | C |
| Engagement thresholds | campaign: `any`,3,5,7; admin filter: 0,2,4,6; match strong ≥7.5 | C (different purposes) |
| Dashboard range | `7d`, `30d`, `90d` | C |
| Decline reasons | `Schedule conflict`, `Budget doesn't match my rates`, `Not a fit for my audience`, `Other` | C |
| Minimum booking | `1 week`, `2 weeks`, `1 month` | wizard C |
| Hire durations | `1-week`(7), `2-weeks`(14), `1-month`(30), `2-months`(60), `3-months-plus`(90) | C |

Status-transition tables:
- Account: `approve: pending→active`; `reject: pending→rejected`; `suspend: active|pending→suspended`; `reactivate: suspended|rejected→active`; other combos skipped (not errors) [C].
- Escrow: `(collected)→held→requested→released` only.
- Request: `pending→accepted|declined` only; terminal.
- Withdrawal: `processing→completed` (or failed).

## 14. Canonical business rules

1. **Fee**: platform fee 20% of gross, rounded once; net = gross − fee; computed and frozen at funding. Rate is a platform setting, not hard-coded [D].
2. **Escrow integrity**: funds only released after creator cashout request with a delivery report; only admin releases; each payment released once; amounts are integer XAF; funding amount 10,000–50,000,000.
3. **Funding precondition**: the creator has accepted the engagement and is an active creator; the brand owns the campaign/hire [D from copy + relational requirement].
4. **Withdrawal**: ≥ 1,000; ≤ available; atomic check+record; Cameroon mobile number; method ∈ MoMo/Orange.
5. **Phone numbers**: `^6\d{8}$` after removing spaces/dashes and `+237`.
6. **Visibility**: brand never sees fee or creator net; creator sees gross/fee/net; admin sees all. Responses shaped server-side per role.
7. **Ownership**: every query/mutation scoped by session user; creator can only cash out own payments; brand can only fund for own campaigns.
8. **Campaign validity**: title 3–80; niche from list; budget 50,000–100,000,000 digits; start not in the past (1-day tz tolerance); end ≥ start; ≤365 days; deliverables 10–1000; ≤5 images ×≤5 MB; list fields from controlled options.
9. **Matching eligibility**: active + approved creator, not at capacity / no conflicting deal, engagement ≥ min, niche, location. Rank by engagement. Broaden locations when primary has < 5 matches (preview only). "Strong" ≥ 7.5.
10. **Creator capacity**: accept blocked when active ≥ max (platform setting, mock = 2). Active = accepted engagements not completed.
11. **Request response**: only pending; decline needs reason from list; terminal.
12. **Hire**: duration ≥ creator minimum booking (month=30 days); payment method ∈ creator's accepted methods; handle pattern `^@?[A-Za-z0-9._]{2,30}$` normalised with `@`; promotion ≤500; name/location 2–80.
13. **Creator application minimums**: ≥1000 total followers; ≥1 platform with handle + followers; price per platform ≥ 5,000 Frs; ≥1 payout account; bio ≥ 40; ≤3 collaborations with 4-digit year; ≥1 brand-fit; accuracy confirmation. Account must be `active` to appear publicly.
14. **Featured**: rating ≥ 4.6, max 6 on home, "Recommended" sort = featured, then rating, then success rate.
15. **Search**: as FFA §18, canonical sorts and filters; accent-insensitive text; `startingPrice` = min platform price; followers filter on total followers; ranges half-open.
16. **Unique constraints**: email (case-insensitive), username, team-member email, invoice number, ticket number, campaign reference, hire reference.
17. **Account gating**: suspended/rejected cannot log in; pending restricted; all state changes notify the user.
18. **Notifications** per §10 catalogue.
19. **Top influencers**: ranked by earnings, not followers (follower counts are inflatable).
20. **Admin ops**: bulk ≤200; message subject 3–120, body 10–2000; ticket subject 5–120, message 10–2000; invite validations as FFA; every admin mutation audited.
21. **Cashout report**: summary 20–1500; 1–5 absolute http(s) links ≤300 chars (rendered as clickable → sanitise).
22. **Reviews/ratings**: derived aggregates (§11).
23. **Security fixes (not behaviour to copy)**: no forgeable cookie; hashed passwords; authN/Z on all admin & dashboard routes and every mutation; server-side file validation; transactional money operations; idempotent payment/withdrawal callbacks; no raw error leakage; rate limit login; CSV export auth.

## 15. End-to-end business flows

**F1 Creator onboarding.** Sign up (creator) → session created, account `pending` → wizard step 1–3 saved as the creator's own draft → submit → application `under_review`; confirmation page `submitted?id=` → admin sees pending user → `approve` → account `active`, public profile (username generated), notification → creator now receives requests and appears in search. Reject → `rejected` + notification; reactivate possible.

**F2 Brand onboarding.** Sign up (brand) → session; account state per [P] (assumed `active`) → lands on post-campaign.

**F3 Browse & discover.** Anyone → `/influencers` filters/sorts/search → profile (bio, style, brand fit, collaborations, per-platform pricing, minimum booking, terms, accepted payment methods).

**F4 Direct hire.** Signed-in brand on a creator profile → hire form → hire request `pending` (ref `HR-…`) → creator notified → creator accepts/declines [implied UI, [P]] → on accept, brand is notified and can fund escrow (F6). Decline → brand notified.

**F5 Post a campaign.** Brand fills form (optionally saves draft → preview with match summary → continue) → submit → campaign `pending_review`, reference `CMP-…`, "posted" page with matched count → admin reviews [UI missing, [P]] → open: requests generated for matched creators (notified) → creator accepts (capacity check) or declines with reason (re-match) → brand notified of acceptance → campaign `accepted`.

**F6 Fund escrow.** Brand opens Payments → "Fund campaign" → selects an accepted engagement (campaign+creator), enters amount, method, payer phone → backend collects mobile-money payment → on confirmation payment `held`, fee/net frozen, invoice issued; creator notified; campaign (if first funded) → `in_progress`.

**F7 Deliver & cash out.** Creator sees the payment `held` (net amount) → posts content → "Request cashout" with delivery report (summary + links) → payment `requested`; brand notified and can read the report; admin sees it in "payout requests / needs attention".

**F8 Release.** Finance/Super Admin reviews report → Release → payment `released`, `releasedAt`; creator wallet `+net`; platform revenue `+fee`; notifications to creator and brand; engagement/campaign marked completed when all its payments are released.

**F9 Withdraw.** Creator wallet `available` > 0 → Withdraw (amount ≥1,000, method, phone) → atomic balance check → withdrawal `processing`, notification → provider transfer → `completed` (≤24 h copy) → wallet `withdrawn` updated.

**F10 Review.** After release, brand may rate the creator (screen missing, [P]) → aggregates update.

**F11 Admin moderation & ops.** Bulk user actions with notifications; message users; flag; security alerts raised by system → dismiss (audited); moderation flags → remove (+notify) / dismiss; support tickets created/triaged; team invites; dashboard KPIs and CSV export.

**F12 Money invariants across flows.** For every payment: `gross = fee + net`; creator wallet `available = Σ released net − Σ withdrawals(processing+completed)`; platform revenue = Σ fee(released); escrow held total = Σ gross(held+requested) — all derivable and reconcilable.

## 16. Items to remove / deprecate from the conflicting frontend versions

**Remove**
1. Demo account picker `/sign-in`, `signInAction` (accountId-only), cookie `ioh_demo_account`, `listActiveAccounts` for sign-in — replaced by credentials login.
2. Duplicate pages: `/brand/campaign-payments` (A) and `/creator/earnings` (A) — superseded by `/brand/payments` and `/creator/payments` (B). Dashboard sidebars (A layouts) should point to the B pages; `/creator/requests` (A-only feature, no B equivalent) is **kept**.
3. Services: `campaign-payments.service.ts`, `earnings.service.ts`, mocks `campaign-payments.mock`, `earnings.mock`; A's `payment.ts`/`earnings.ts` types (`on_hold`, `payout_requested`, `mtn_momo` mix). `requestPayout(earningId)` without report.
4. Duplicate campaign form: pick one UI. Canonical fields = B (`/post-campaign`); keep A's draft → preview → posted flow (**move onto B's fields**). Retire A's free-text `location/interests/ageRange` and `durationDays`, the `0/1/2/3/5/8` engagement list, and `services/campaigns.service.ts` duplicates of `direct-campaigns.service.ts` (A's draft/preview/match-preview functions survive in the merged service). Pick one route (`/campaigns/new` vs `/post-campaign`; the navbar uses `/campaigns` → `/campaigns/new`).
5. `accounts.service.getCurrentBrandAccount` and `creator.service.getCurrentCreatorAccount` fixed mock identities (`brand-lumiere`, `inf-amara`) → session user.
6. Free-text relationships: `campaign: string`, `campaignTitle`, `brandName`, `creatorName` strings on payments/requests; `SupportTicket.from.name`; hire request `influencerId` only as id is fine, brand name free text is not.
7. `Bank transfer` as an accepted payment method; "PaymentMethod" spelled two ways.
8. Fake aggregates: `MOCK_PERIOD_KPIS`, `previousRevenue`, hard-coded platform stats ("1,284+ …"), monthly payment stats, `lifetimeEarned`.
9. The `Campaign` type name collisions (`types/campaign.ts`, `types/direct-campaign.ts`, `types/dashboard.ts` `CampaignStatus`) — one definition.
10. Global (non-per-user) creator application draft.
11. Rate comparisons that assume `Withdrawal.date` vs `requestedAt` — one field set.
12. Admin-created tickets with typed-in names → select a user.

**Keep (from A)**: sign-up/login forms and validation, password rules endpoint, `remember`, draft/preview/posted flow, match preview with top matches/broadening, creator requests inbox + decline reasons + capacity, creator application wizard, A-style earnings summary tiles (computed from B).

**Needs frontend work after backend decisions** (not done here): wire sidebars, add missing screens flagged [P].

## 17. Remaining ambiguities requiring a product decision

1. Do brand accounts require admin approval (`pending`) or start `active`? Can `pending` creators log in with restricted access (assumed yes)?
2. Campaign review: what does admin "review" do (approve/reject/edit)? Add `rejected`/`cancelled` campaign states? Who uses the unbuilt "Campaigns" admin module?
3. When are campaign requests created (after approval vs at post), and how are multiple accepting creators combined — one budget per creator or a shared budget split? Does the brand "choose" (A copy) or does acceptance bind automatically (B/creator UI)?
4. Direct hire: price source (creator rate card vs brand offer), creator-side screen to accept/decline hire requests, request expiry.
5. "Conflicting deal" and "verified" definitions for matching; creator `maxActiveCampaigns` (global 2 or per-creator).
6. Funding amount vs campaign budget/rate: must it equal the agreed price? Partial/milestone payments (A mentions 50% deposit terms in creator rate card — are deposit terms purely informational?).
7. Payment provider/aggregator for MoMo/Orange collection and payout; failure/refund handling; who completes withdrawals (system only?); fee on withdrawals (none in UI).
8. Refund & dispute behaviour (UI shows data but no actions); fate of escrowed money on cancellation.
9. Review model: text or score only, one per engagement, who can review, `successRate` definition.
10. Engagement rate, language, content style: not collected by the wizard — self-reported fields to add, or admin-entered? Follower refresh strategy.
11. Final niche and city lists (three vocabularies); engagement thresholds (3/5/7 vs A's set; admin 2/4/6).
12. Admin RBAC matrix beyond "release → Super Admin + Finance"; invitation acceptance flow; audit-log visibility.
13. Password reset, email verification, phone verification, login throttling policy.
14. Notification read state, channels (email/SMS), user-facing notification centre, and whether a notification bell exists.
15. Support: can users open tickets; replies/assignment/status change; SLA metrics source.
16. Compliance documents: upload and verification workflow; required before payouts?
17. Reference + invoice dual identifiers (`INV-n` and `ESC-YYYY-…`) — keep both?
18. Whether `Bank transfer` should return as a payout/payment method.
19. Brand wallet/deposit concept (`deposit` transaction kind) — only escrow funding, or prepaid balance?
20. Resubmission of rejected creator applications; account/profile deletion and data retention.
21. Terms/Privacy/Escrow policy content (placeholders) and consent record.
