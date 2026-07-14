# ReviewOS — Shopify AI Review Platform

Commercial Shopify app (not a demo): AI-first product reviews with filter-aware summaries, merchant-defined dynamic attributes, marketplace rating aggregation, and drag-and-drop theme blocks. Goal: sellable on the Shopify App Store.

## Read first, in order
1. `STATE.md` — where the project is right now, what's next. Always current.
2. `PRD.md` — product spec (what we're building and why, competitor gaps).
3. `ROADMAP.md` — phased build plan; each phase has entry/exit criteria.
4. `docs/RESEARCH.md` — verified facts (Shopify APIs, App Store rules, legal marketplace sourcing, hosting). Cite this instead of re-researching.

## Stack (decided)
- **Demo-first (Phase D, current)**: standalone React Router 7 + Prisma (SQLite) app in `reviewos/` showing the full review experience on a fake product page; later ported into the official Shopify template (same framework, deliberate).
- Portability rules: business logic only in `app/services/*`; widget is a framework-free embeddable JS+CSS bundle (`widget/`) rendering into `<div data-reviewos>`; `/api/*` JSON contracts identical to future App Proxy routes. Nothing Shopify-specific inside services or widget.
- Prisma; SQLite in dev, Postgres in prod.
- Shopify app (Phase 0+): official React Router 7 template, embedded admin (Polaris), Theme App Extension blocks, data via App Proxy.
- AI: **Groq only** (`GROQ_API_KEY`, OpenAI-compatible API, free tier; cache summaries in DB, never generate per-page-load). Registry in `app/services/ai/` stays pluggable but only `groq` is registered — do NOT add Anthropic. Env var may be present-but-empty, so resolve with `|| "groq"`, never `?? "groq"` (LEARNINGS #29).
- No hardcoding of categories or filters — merchant-defined attributes drive everything.

## Orchestration policy
- Main session = orchestrator: plan, dispatch, review. Implementation and bulk reading go to subagents.
- Model escalation: **haiku** for grunt work (lookups, mechanical edits, running commands, parsing) → **sonnet** when haiku can't (multi-file implementation, copy, synthesis) → **opus/fable** only for genuinely hard reasoning, and ask the user first.
- Subagents start cold: restate the full spec in the prompt (never "implement the plan above"). Verify subagent output before trusting it; diff-reviewer pass before declaring a substantive phase done.
- Marketplace data is dual-mode: merchant-owned (default) + flag-gated live-fetch connector (Phase 5b). Never remove the kill switch; risk rationale in PRD.md. Phase 5b live-fetch code is never included in App Store submission builds.

## Rules
- Category-agnostic always: no hardcoded attribute names, filter lists, or product-type logic.
- Reviews sync `reviews.rating` / `reviews.rating_count` metafields (Shopify standard).
- Secrets only in `.env` (gitignored); never in code.
- After each phase: update `STATE.md`, run typecheck + relevant tests before calling it done.
- Use `shopify-plugin:*` skills (shopify-use-shopify-cli, shopify-liquid, shopify-polaris-app-home, shopify-admin) when touching the corresponding layer.

## Commands
- Dev: `shopify app dev` (Cloudflare tunnel built in). Kill stale port first.
- DB: `npx prisma migrate dev`, seed via `npm run seed` (once created).
