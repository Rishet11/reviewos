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

## Phase 4 — Product linkage + AI service — DONE (2026-07-15), pending live theme-editor check
Real product linkage: `Product.slug = Shopify handle` via catalog sync (`syncProductsFromCatalog`) + auto-create on unknown handle (`resolveProductForShop`), GID stored for future metafield writeback. AI (Groq, provider-pluggable; Anthropic swappable later): overall + cohort (filter-aware) summaries, DB caching + min-review (3) threshold, `force` regen; ai-summary block wired (refetch on filter change, hide when null); admin regenerate control + products sync page. Merchant-facing "review generation" = AI condensation of real reviews; `fabricateReviews` stays dev-flag-only, never merchant-facing (FTC + Shopify 1.3). Deferred within Phase 4: tag/sentiment extraction, in-process job queue (BullMQ+Redis → Phase 8), `reviews.rating` metafield writeback (GID column added to enable it).
Exit: summary appears, changes when filter chips change, regenerates on demand. (Code verified: typecheck/vitest/build green. Live theme-editor confirmation outstanding.)

## Phase 5 — Marketplace aggregation (merchant-owned data) — DONE at Slice A (2026-07-15)
**Slice A (SHIPPED):** marketplace manager admin (manual stats entry), marketplace-ratings trust-badge block, storefront trust badges + link-outs. Merchant types the public marketplace figure (e.g. "Amazon 4.6 · 12,431"); manual stat is authoritative. Marketplace ratings stay SEPARATE from the standard `reviews.rating`/overall badge. This is the defensible merchant-owned design (RESEARCH.md L26). Verified: tsc/vitest 42/vitest build green; live theme-editor check outstanding.
**Slice B (PARKED → Phase 7d, unchanged):** CSV review-body import + per-marketplace AI summaries ("What Amazon customers say") + UGC gallery. GATE FAILED (web-research 2026-07-15): no marketplace (Amazon/Flipkart/Nykaa) exposes review bodies to sellers, so a "marketplace review CSV" has no legitimate source (same scraping provenance as Phase 5b, liability shifted to merchant). Moved to Phase 7d as-is per user; not built in submission scope.
Original spec retained for 7d: pluggable connector interface (CSV v1), per-product URL on `MarketplaceStat.url`. No own-infrastructure bulk scraping in any App Store submission build.

## Phase 5b — Marketplace live-fetch connector (optional, flag-gated)
Adapter interface `app/services/marketplace/providers/` (provider contract: fetchStats, fetchReviews); providers: Unwrangle, Real Data API (Flipkart/amazon.in), generic JSON; merchant supplies own API key; scheduled refresh via background jobs; per-shop + global kill switch; risk notice in admin UI (see PRD "Live fetch risk").
Not included in App Store submission builds; post-approval opt-in only (see PRD Live fetch risk).
Exit: with a provider key entered via the admin settings UI (stored per-shop) and the shop flag on, marketplace data populates for a test product without CSV; flag off hides the connector entirely.

## Phase 6 — Media & collection
R2 (or Shopify Files) photo/video upload on write-review; post-purchase review-request email with verified deep link; verified-buyer badge from order linkage. Review-request email: default timing 3-5 days post-delivery with purchase-recency cohort triggers, max 3 touches per customer. WhatsApp review requests via merchant-authenticated WhatsApp Business API as v1.1; SMS after that.
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

## Phase 7d — Competitor + marketplace review import
Judge.me/Loox export formats. PLUS the parked Phase 5 Slice B (marketplace CSV review-body import + per-marketplace AI summaries + UGC gallery) as originally specced — feedstock caveat: only build against sources with a legitimate merchant-owned export (Trustpilot Business API, Google Business Profile API, Judge.me/Loox/Yotpo CSV); marketplace CSVs (Amazon/Flipkart/Nykaa) have no legit export (see Phase 5 note).
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
