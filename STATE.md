# STATE (updated 2026-07-14 night)

## Done
- Docs: CLAUDE.md (rules + orchestration policy), PRD.md, ROADMAP.md (Phase D → 0-8), docs/RESEARCH.md (verified facts, cite instead of re-searching).
- D1: React Router 7 + Prisma/SQLite app in `reviewos/`, full schema, services (`app/services/`), JSON APIs, multi-category seed (3 products, ~90 reviews). Verified.
- D2: framework-free widget bundle (`widget/` → `public/widget/reviewos.js`), blocks: summary, distribution bars, dynamic filter chips (URL-synced), feed, write-review modal. Demo pages `/demo/:slug` + index `/`. Verified in headless browser after fixing widget-mount vs React-hydration race (commit 5e7e2d7). User has seen it working.
- D3: Groq AI service (`app/services/ai/`: provider.ts / groq.ts / index.ts / summaries.server.ts, model llama-3.3-70b-versatile, AI_PROVIDER env-switchable). Cached summaries in AiSummary (min 3 reviews to generate, refresh when cohort grows >=5 or >=20%, never per-page-load; cohortKey = sorted attr=value pairs). `/api/ai/summary` route, ai-summary widget block (refetches on filter change, seq-guarded against stale responses, hides when null), `/admin` with per-product "Generate AI demo reviews" (8 via Groq) + "Regenerate summary". Exit criterion verified in headless browser: clicking 18-24 chip swapped in a distinct cohort summary; caching confirmed (no Groq call on reload). Diff-reviewer pass clean; known soft spots: getOrGenerateSummary trusts callers to keep scope/filters consistent; no unit tests on threshold/cohortKey logic (verified by browser + code read only).

## In progress
- Nothing mid-file. Next milestone not started.

## Next
- D4: marketplace trust badges block + UGC gallery with lightbox (data/models already seeded).
- D5: design polish (impeccable / frontend-design skill) + deploy to Vercel/Render free tier, shareable URL.
- After Phase D: stakeholder feedback → Shopify phases per ROADMAP.md.

## Gotchas
- Run: `cd reviewos && npm run dev` → http://localhost:5173/demo/glow-lab-vitamin-c-serum (kill stale: `lsof -ti:5173 | xargs kill`).
- Env: GROQ_API_KEY in `reviewos/.env` (present; user must ROTATE it post-demo, it was exposed in chat). DATABASE_URL is relative to prisma/ ("file:./dev.db").
- Widget must mount after React hydration (window.load in widget/src/index.ts) — do not "simplify" back to DOMContentLoaded, it breaks everything silently.
- Reseed: `npm run seed`. Typecheck: `npm run typecheck`. Playwright is installed for headless verification (screenshots + console errors).
- Follow CLAUDE.md orchestration policy: delegate builds to sonnet subagents with full cold-start specs, verify their claims yourself, update this file after each milestone.
