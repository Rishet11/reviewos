# STATE (updated 2026-07-16 22:15) — history: git log + docs/STATE-ARCHIVE.md

## Done
- Verification sweep: Phase 5/6 claims confirmed; graphify current; fixed 5 TS errors (widget mount.ts) + added marketplace test (93/93); docs drift fixed; all Phase 6 work committed+pushed (c3055b9..90999db).
- Prisma migration baseline: replay on scratch Postgres == schema.prisma, migrate status clean (6 migrations).
- Phase 8 partial: Render service LIVE https://reviewos-6p4p.onrender.com (free tier, Docker, rootDir shopify-app, env vars set via API, service id srv-d9cf1ht7vvec73cbsju0). Separate prod app "ReviewOS" (client_id 4d89e9f395a278d509a5528c42d7a740, shopify.app.production.toml); version reviewos-2 released WITHOUT orders/* webhooks (blocked on protected-customer-data). Prod OAuth+install VERIFIED; dispatch route VERIFIED (401/200); app proxy VERIFIED live (200 JSON via storefront; binds at install time, required reinstall). GH Actions cron workflow committed (secret NOT set). docs/LISTING.md (App Store copy) + docs/lighthouse-7e.md (baseline 92.41 weighted: home 89/product 90/collection 96; floor 82.41; runner scripts/lighthouse-7e.mjs).

## In progress
- BUG: embedded admin renders bold "200" instead of app UI (admin.shopify.com/store/reviewos/apps/reviewos-1). Server fine (logs: OAuth ok, session created, GET /app/billing 200). Hypothesis: client-side thrown Response(200) hits React Router default error boundary (app.billing.tsx has no ErrorBoundary; app.tsx boundary.error may rethrow). Suspects: App Bridge bootstrap, billing.require/check in prod mode (BILLING_TEST=false, never live-tested). Debug with browser console (user) or Claude Chrome extension.

## Next
1. Fix the "200" embedded-admin bug (console evidence first, no guessing).
2. User: run `gh secret set CRON_SECRET` (command in chat history) so the 15-min cron works.
3. Protected-customer-data request via partners.shopify.com (dev-dashboard apps may not appear there, known Shopify bug); then re-add 3 orders/* webhooks to shopify.app.production.toml + user runs `shopify app deploy --config production --allow-updates`.
4. Re-add theme blocks in theme editor, then "after" Lighthouse pass (same runner; must stay ≥82.41).
5. R2 + Resend creds into Render env; live E2E (media, verified-buyer order, review-request email).
6. Billing test charge (dev app) + real-mode check (prod). 7. Render Starter upgrade + rotate Neon/Groq/RENDER_API_KEY before submission. 8. Listing assets per docs/LISTING.md.

## Gotchas
- Dev: `cd shopify-app && shopify app dev` (dev app reinstalls and COLLIDES with prod on /apps/reviewos proxy; uninstall one). Prod deploys: user runs deploy command via `!` (permission-gated for Claude).
- Free tier cold starts: proxy 503s + webhook 500 blips until Starter upgrade. Shopify retries webhooks; proxy just fails.
- Env names: DATABASE_URL, GROQ_API_KEY, SHOPIFY_API_KEY/SECRET, SHOPIFY_APP_URL, CRON_SECRET, REVIEW_VERIFICATION_SECRET, SENTRY_DSN (empty=off), R2_*, RESEND_*, RENDER_API_KEY (in shopify-app/.env, exposed in chat, rotate after Phase 8).
- Storefront password cookie is `_shopify_essential` (not storefront_digest); store pw imefru.
