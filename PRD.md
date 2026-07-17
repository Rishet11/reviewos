# PRD — ReviewOS

## One-liner
AI-first Shopify review app: category-agnostic dynamic review attributes, filter-aware AI summaries, and marketplace rating aggregation, sold as a paid App Store app.

## Problem
Incumbents (Judge.me, Loox, Okendo, Yotpo, Stamped) do collection + display well, and several already do basic AI summaries. None do: cohort/filter-aware summaries ("what do dry-skin users aged 25-34 say"), aggregation of the merchant's marketplace presence (Amazon/Flipkart/Nykaa/Smytten) into on-store trust badges, or AI chat grounded in the actual review corpus. Yotpo/Stamped also leak users over pricing complexity, reliability, and support (see docs/RESEARCH.md).

## Target customer
D2C brands (initially India-focused, hence Flipkart/Nykaa/Smytten) that sell on their own Shopify store AND on marketplaces, want their marketplace social proof visible on-store, and sell products where "fit for me" matters (skincare, apparel, electronics).

## Differentiators (build moat here)
1. **Filter-aware AI summaries** — summary regenerates for the shopper's selected cohort (merchant-defined attributes).
2. **Marketplace trust aggregation — dual-mode.** Default (App-Store-safe): merchant-owned data via manual entry + CSV import of their own marketplace review exports. Optional (off by default, flag-gated, BYO API key): live-fetch connector through pluggable third-party providers (Unwrangle, Real Data API for Flipkart/amazon.in). Both fill the same tables and power trust badges, link-outs, and per-marketplace AI summaries ("What Amazon customers say"). Staleness monitoring via weekly cron reminders (Pro tier, kill-switched provider skeleton).

   **Live fetch risk (stakeholder-accepted):** marketplace ToS prohibit scraping and vendor ToS prohibit redistribution (details + sources in docs/RESEARCH.md). The Phase 5b live-fetch connector is designed and flag-gated but NOT built; it will never be included in App Store submission builds. It would ship behind a per-shop and global kill switch with the merchant supplying their own vendor key, and liability for that vendor choice sits with the merchant. This risk was disclosed and the stakeholder chose to include the feature. If live-fetch never ships publicly, the v1 moat is cohort AI summaries, category-agnostic attribute engine, and native metaobject compliance.
3. **Category-agnostic attribute engine** — merchants define unlimited custom attributes (skin type, shoe use, battery concern); filters, review form fields, and AI cohorts all derive from them. Zero hardcoding.
4. **Native-standard compliance** — sync to Shopify's standard review metaobject + `reviews.rating` metafields → Shop app eligibility, "Verified by Shop".

## Core features (v1, sellable)
- Review CRUD: rating, title, body, photos/videos (R2 storage), helpful votes, merchant replies, verified-buyer badge (order-linked), status workflow (auto-approve / manual / reject / escalate rules).
- Review collection: post-purchase email request with deep-link form (order-verified); SMS/WhatsApp review request blast from past buyers (free plan 200/mo cap, Pro tier channels).
- AI service: overall + per-marketplace + cohort summaries (cached, threshold-gated, regenerated via background job on approval), sentiment/tag extraction, AI demo-review generator (dev/demo tooling, clearly labeled; never fake reviews in production stores).
- Storefront: Theme App Extension app blocks (ai-summary, rating-distribution, marketplace-ratings, ugc-gallery, filter-chips, review-feed, write-review, star-badge), each configurable in Theme Editor; App Proxy data; URL-synced filters.
- Admin (Polaris, embedded): moderation queue, attribute manager, marketplace data manager (manual + CSV import), settings, AI controls.
- Commercial plumbing: Billing API (free plan + paid tier, trial), GDPR webhooks, protected-customer-data compliance, review import from Judge.me/Loox exports (migration lever).

## Explicitly out of v1
Geo-personalization, multi-language syndication, bundle review mapping, Klaviyo/Smile integrations (webhooks emitted, integrations later), analytics dashboard beyond basics, AI review chat (v2 flagship), Hydrogen SDK (v2).

## Success criteria (v1)
- Passes Shopify App Store review; installable, billable.
- Full loop works on a real store: order → review request → submit with photos → moderate → published widget → AI summary updates → cohort filter changes summary.
- Storefront Lighthouse impact ≤10 points.
- Runs live on the founder's own store with real data.
- Market validation: at least 1 external merchant installs and keeps it for 30 days.

## Pricing (initial hypothesis, validate later)
Free (≤50 orders/mo, basic widgets) · Growth $19/mo (parity tier: reviews, media, basic AI summary; matches what Okendo/Loox already offer) · Pro $49/mo (moat tier: cohort/filter-aware AI, marketplace aggregation, CSV import, priority support).
