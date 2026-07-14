# ROADMAP — ReviewOS (phased; each phase ends verified + STATE.md updated)

## Phase D — Standalone demo website (CURRENT, precedes all Shopify phases)
Stakeholder-facing demo with zero Shopify dependency; everything portable into the Shopify app later (see CLAUDE.md portability rules).
- D1 Skeleton: React Router 7 + Prisma app in `reviewos/`, full schema (Review, ReviewMedia, AttributeDefinition, MarketplaceSource/Stat/Review, AiSummary, Settings), multi-category seed. Exit: server runs, `/api/reviews` returns seeded JSON.
- D2 Widget core: embeddable bundle (feed, rating distribution, helpful votes, attribute-driven write-review, dynamic URL-synced filter chips) on a polished fake product page. Exit: working widget in browser.
- D3 AI (Groq): cohort filter-aware + overall + per-marketplace summaries, cached; one-click AI demo-review generator in `/admin`. Exit: summary changes when filters clicked. [USER] Groq key from console.groq.com → `.env` `GROQ_API_KEY`.
- D4 Marketplace + media: trust badges (logos/ratings/counts/link-outs) from admin/CSV data; UGC gallery + lightbox. Exit: full vision-style page.
- D5 Polish + deploy (Vercel/Render free). Exit: shareable URL.
Then: stakeholder feedback → Phase 0 (Shopify) with port map recorded in STATE.md.

## Phase 0 — Setup (user actions, blocks everything) — DONE
- [x] Shopify dev account (rishetmehra11@gmail.com, org "ReviewOS") + development store (reviewos.myshopify.com, password `imefru`).
- [ ] Anthropic API key → `.env` (not obtained; only needed at Phase 4, and demo uses Groq — decide Groq vs Anthropic then).
- [x] Node 20.10+ (have v26.5), Shopify CLI (4.5.0).
Exit: `shopify auth login` works; dev store exists. ✔

## Phase 1 — Scaffold & walking skeleton — DONE (2026-07-14)
`shopify app init` (React Router 7 template) → `shopify app dev` → installed on dev store; embedded admin renders; hello-world theme app block visible on product page; App Proxy `/apps/reviewos/status` returns JSON. Lives in `shopify-app/`. Verified live (admin screenshot, block on product page, curl 200 JSON). Committed on branch `phase-1-shopify-skeleton`.
Exit: screenshot of admin + block on product page. ✔

## Phase 2 — Review core (data + admin)
Prisma models (Review, ReviewMedia, AttributeDefinition, MarketplaceSource/Stat/Review, AiSummary, Settings); services in `app/services/`; moderation queue + attribute manager + settings in Polaris admin; seed script.
- [ ] [USER-adjacent] Request Shopify protected-customer-data access when models first touch customer/order data; Shopify-gated approval with lead time; Phase 6 verified-buyer depends on it.
Exit: create/moderate/reply to reviews in admin; typecheck + service tests pass.

## Phase 3 — Storefront widget v1
Entry check: verify on shopify.dev that multiple app blocks coexist on one product template given the 1-resource-setting-per-type limit, before building all 8 blocks.
App blocks: review-feed, rating-distribution, star-badge, write-review (attribute-driven form), filter-chips (dynamic, URL-synced). App Proxy endpoints with pagination/filtering. Scoped CSS, schema settings per block.
Exit: full submit→moderate→display loop on dev store; blocks reorder/configure in Theme Editor.

## Phase 4 — AI service
Anthropic integration: overall summary, cohort (filter-aware) summaries, tag/sentiment extraction; caching + min-review threshold; in-process job queue for dev phases (decision: BullMQ+Redis deferred to Phase 8); ai-summary block; demo-review generator behind a dev flag.
Exit: summary appears, changes when filter chips change, regenerates on new approval.

## Phase 5 — Marketplace aggregation (merchant-owned data)
Marketplace manager admin (manual stats entry + CSV review import for Amazon/Flipkart/Nykaa/Smytten exports), marketplace-ratings trust-badge block, per-marketplace AI summaries, ugc-gallery block with lightbox.
Exit: marketplace badges + "What Amazon customers say" live on storefront from imported data.

## Phase 5b — Marketplace live-fetch connector (optional, flag-gated)
Adapter interface `app/services/marketplace/providers/` (provider contract: fetchStats, fetchReviews); providers: Unwrangle, Real Data API (Flipkart/amazon.in), generic JSON; merchant supplies own API key; scheduled refresh via background jobs; per-shop + global kill switch; risk notice in admin UI (see PRD "Live fetch risk").
Not included in App Store submission builds; post-approval opt-in only (see PRD Live fetch risk).
Exit: with a provider key entered via the admin settings UI (stored per-shop) and the shop flag on, marketplace data populates for a test product without CSV; flag off hides the connector entirely.

## Phase 6 — Media & collection
R2 (or Shopify Files) photo/video upload on write-review; post-purchase review-request email with verified deep link; verified-buyer badge from order linkage.
- [ ] [USER] Place a test order on the dev store (needed for verified-buyer + review-request email tests).
Exit: photo review submitted from storefront displays in gallery; request email fires on test order.

## Phase 7a — Billing API
Free + paid plan, trial.
Exit: test charge succeeds on dev store.

## Phase 7b — GDPR webhooks
Customers/redact, customers/data_request, shop/redact respond 200 and perform the action. (Note: protected-customer-data approval was requested back in Phase 2.)
Exit: webhook test suite passes.

## Phase 7c — Standard review metaobject
Standard review metaobject + reviews.rating / reviews.rating_count metafield sync, including a backfill script for all reviews created in earlier phases.
Exit: metafields visible on product; backfill idempotent on rerun.

## Phase 7d — Competitor review import
Judge.me/Loox export formats.
Exit: sample export file imports cleanly.

## Phase 7e — Performance pass
Storefront Lighthouse impact ≤10 points.
Exit: Lighthouse impact ≤10 points.

## Phase 8 — Production & submission
Postgres migration (Neon/Render), deploy (Render or Fly), R2 config, error monitoring, Redis + BullMQ provisioning, App Store listing assets, submit for review.
- [ ] [USER] App listing assets: icon, screenshots, listing copy, support contact; complete submission form.
Exit: app live on prod URL, submission sent.

## v2 backlog
AI review chat, Hydrogen/headless SDK, analytics dashboard, Klaviyo/Smile integrations, multi-language, geo-personalization, bundle mapping, Trustpilot/Google official-API integrations.
