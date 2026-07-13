# RESEARCH.md — Verified facts (researched 2026-07, cite instead of re-searching)

## Shopify platform
- `shopify app init` default: **React Router 7 template**, Node 20.10+, Prisma + SQLite included. https://shopify.dev/docs/apps/build/scaffold-app
- Theme App Extensions: app blocks in `blocks/*.liquid` with schema settings; merchants add/reorder/configure in Theme Editor; full-width blocks auto-wrap in `apps.liquid`. Limits: 1 resource setting per type per section. https://shopify.dev/docs/storefronts/themes/architecture/blocks/app-blocks
- Storefront data: App Proxy (`https://<shop>/apps/<subpath>` → app route); configure prefix+subpath in `shopify.app.toml`. https://shopify.dev/docs/apps/build/online-store/app-proxies
- Metaobjects API: `metaobjectDefinitionCreate`, `$app:` reserved prefix; limits 32 definitions/app, 64 fields/def. https://shopify.dev/docs/apps/build/metaobjects/manage-metaobject-definitions
- **Standard product review metaobject** (19 fields; required: Rating, Submitted At, Source, Product, App Verification Status). Syncing to it + maintaining `reviews.rating` / `reviews.rating_count` metafields makes reviews eligible for Shop app + "Verified by Shop" badge. https://shopify.dev/docs/apps/build/metaobjects/standard-review-metaobject
- `shopify app dev` uses built-in Cloudflare quick tunnels; dev stores free via Dev Dashboard.

## App Store / commercial requirements
- Must use Shopify Billing API exclusively. Rev share: 0% on first $1M/yr, then 15%. https://shopify.dev/docs/apps/launch/distribution/revenue-share
- Mandatory GDPR webhooks: `customers/redact`, `customers/data_request`, `shop/redact` (200 response, action within 30 days). https://shopify.dev/docs/apps/launch/privacy-requirements
- Protected customer data approval needed for customer/order access (verified-buyer feature). https://shopify.dev/docs/apps/launch/protected-customer-data
- Performance: admin LCP ≤2.5s, CLS ≤0.1, INP ≤200ms; storefront Lighthouse impact ≤10 pts. Built for Shopify badge: ≥50 net installs, 5+ reviews, embedded admin, latest App Bridge. https://shopify.dev/docs/apps/launch/built-for-shopify/requirements
- Common rejections: broken OAuth redirects, missing Billing API, pricing inconsistencies, no test credentials. https://shopify.dev/docs/apps/launch/app-store-review/pass-app-review

## Competitors (2026)
- Judge.me (free + $15/mo, 35k reviews, 5.0★) · Loox ($0–299/mo, AI replies/translate, video) · Okendo ($19–499, AI summaries + attribute tagging) · Yotpo (complex pricing, support complaints) · Stamped (reliability complaints) · Air Reviews · Fera.
- AI summaries already exist (Okendo, Yotpo, Loox, Stamped). **Gaps none fill well**: filter-aware/cohort AI summaries, marketplace rating aggregation, AI review chat (answers from actual review corpus), headless/Hydrogen-first widgets, review-coverage-gap detection, migration ease, support quality.
- Sources: apps.shopify.com listings + pricing pages (see chat log 2026-07-14).

## Marketplace review sourcing — LEGAL VERDICT
- **No compliant scraping path.** Amazon ToS prohibits scraping; third-party APIs (Unwrangle $99+/mo, Rainforest/Traject $66+/mo, SerpApi $75+/mo, Axesso) all prohibit reselling/redistributing raw data in their own ToS; SerpApi under active Google DMCA litigation (Dec 2025 suit). India-focused "Real Data API" claims Flipkart/amazon.in extraction but same redistribution problem.
- Amazon SP-API / Flipkart Seller API do not expose review bodies for redistribution.
- **Defensible design**: (a) merchant manually enters or CSV-imports their own marketplace ratings/review exports (merchant asserts ownership), (b) display aggregate stats + link-outs (rating, count, URL, logo) rather than full scraped review bodies, (c) optional integrations with legitimate review platforms (Trustpilot/Google have real APIs) later.

## Production stack
- Hosts: Render (managed Postgres, $7–25/service, has a Shopify-app deploy guide: https://render.com/docs/deploy-shopify-app) or Fly.io. Vercel poor fit (long jobs). Railway reliability concerns.
- DB: Postgres in prod mandatory (SQLite lost per deploy). Neon or Supabase or Render Postgres; Prisma supports all.
- Media: Cloudflare R2 (cheap, free egress) or Shopify Files API (img ≤20MB, video ≤1GB). R2 recommended for review media at scale.
- Background jobs (AI summaries, imports): BullMQ + Redis if persistent Node host (Render/Fly) — recommended; Inngest if serverless.

## AI
- Decision 2026-07-14: **Groq** (free tier, OpenAI-compatible chat completions API) for summaries/sentiment/generation; key via `.env` `GROQ_API_KEY`. Free-tier rate limits are tight → summaries are cached in DB and generated on demand only, never per-page-load. Provider interface keeps Anthropic (`claude-haiku-4-5`) as a drop-in swap for production scale.
