# STATE (updated 2026-07-15 05:00) — full history: docs/STATE-ARCHIVE.md

## Done
- Phases D, 0, 1, 2 (see archive). Phase 3a: multi-tenancy (`shop` on all domain models, shop-scoped uniques, services take `shop` first, migration 20260715120000, cross-shop isolation tests).
- Phase 3b: signed App Proxy (`app/lib/proxy-verify.server.ts`; endpoints /reviews /distribution /attributes /summary /status) + theme extension `extensions/reviewos-widgets` (blocks: review-feed, star-badge, rating-distribution, write-review, filter-chips; filter sync via URL + `reviewos:filters-changed` event). LIVE-VERIFIED by user in theme editor on reviewos.myshopify.com.
- Phase 4: real product linkage + AI summaries wired in.
  - `app/services/products.server.ts`: `syncProductsFromCatalog(shop, admin)` (paginates Admin GraphQL `products(first:250)`, upserts on `shop_slug`, slug=handle, stores GID) + `resolveProductForShop(shop, handle)` (findUnique → enrich via `unauthenticated.admin(shop)` `products(query:"handle:..")` → bare-row fallback; P2002 race-guarded; `unauthenticated` lazy-imported so proxy import graph doesn't instantiate shopifyApp).
  - Schema: added `Product.shopifyProductId String?` (GID; enables future reviews.rating metafield writeback). Applied via `prisma db push`.
  - Proxy routes (`proxy.reviews` action, `proxy.summary`, `proxy.attributes`) resolve via `resolveProductForShop` (auto-create on unknown handle). `proxy.reviews` loader + `proxy.distribution` degrade to empty (no create) on miss by design.
  - Admin: new `app/routes/app.products.tsx` (lists products + "Sync from Shopify catalog") + nav link in `app.tsx`; `app.reviews.tsx` gained `regenerate-summary` intent → `getOrGenerateSummary(shop, productId, "overall", {}, force:true)`.
  - Widget: `ai-summary.liquid` block + `renderAiSummary` wired into `shopify/mount.ts` (own `aiSummarySeq`, refetches on `reviewos:filters-changed`, hides when null); `fetchSummary` forwards attr filters for cohort summaries. Bundle rebuilt into extension assets via `reviewos/widget/build.mjs`.
  - VERIFIED: typecheck clean, vitest 23/23, `shopify app build` clean (theme-check ok), widget build ok, diff-review clean.
  - LIVE-DEBUGGED (2026-07-15): AI summary block showed nothing on a real store product because (a) `getAiProvider()` used `?? "groq"` but `.env` has `AI_PROVIDER=` (empty) → selected provider `""` → threw on every generation. Fixed to `|| "groq"` (`app/services/ai/index.ts`). (b) Real store products had 0 reviews (seed reviews only on fictional slugs). Additively seeded 16 approved reviews + `ridingStyle`/`skillLevel` attribute defs on `the-collection-snowboard-liquid`. Groq then generated overall (16 reviews) + `ridingStyle=powder` cohort (3) summaries, both cached, verified via the real `getOrGenerateSummary` (tsx). Sync confirmed: 16 real store products carry GIDs. User to refresh preview + restart `shopify app dev` so the AI_PROVIDER fix loads for uncached cohorts.

## Decisions
- **AI: Groq only.** No Anthropic. Provider registry (`app/services/ai/index.ts`) stays pluggable but only `groq` is registered; do not add Anthropic. Remove/ignore the empty `AI_PROVIDER=` line in `.env` (or set `AI_PROVIDER=groq`).
- Docs: `docs/FOR-STAKEHOLDER.md`; RESEARCH.md 2026-07-15 findings. graphify knowledge graph refreshed (`graphify-out/`).
- NOTHING COMMITTED this session; commit only when user asks.

## In progress
- None. Phase 4 code done; awaiting user live theme-editor check.

## Next
1. Live-verify Phase 4 in theme editor (add AI-summary block on a real product, filter click swaps cohort summary, hides < 3 reviews; run `app.products` sync + `app.reviews` regenerate).
2. GDPR webhooks (7b) + billing (7a): hard App Store blockers, pull earlier if submission nears.
3. Get stakeholder answers to docs/FOR-STAKEHOLDER.md before Phase 5 scoping.

## Known tradeoff (Phase 4)
- GET proxy loaders (`/summary`, `/attributes`) can auto-create a bare Product row for a typo'd/crawled handle before a merchant ever syncs. Low harm (empty shop-scoped rows, wiped on reseed); accepted for now. Revisit if crawler noise pollutes the catalog.

## Gotchas
- Run: `cd shopify-app && shopify app dev` (dev store reviewos.myshopify.com); kill stale port first.
- Env names: DATABASE_URL, GROQ_API_KEY, SHOPIFY_API_SECRET, SHOP_DOMAIN. ROTATE Neon password + GROQ_API_KEY (exposed in chat). Protected-customer-data request not started.
- Never put `.test.ts` under `app/routes/` — React Router loads it as a route; vitest import 500s every request (bit us live).
- Neon P1001 at dev start = scale-to-zero cold-start blip; retry or add `connect_timeout=15` to DATABASE_URL.
- Reseed with `SHOP_DOMAIN=reviewos.myshopify.com npm run seed`; block `{% schema %}` name max 25 chars.
