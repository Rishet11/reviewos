# STATE (updated 2026-07-14 evening)

## Done
- Docs: CLAUDE.md (rules + orchestration policy), PRD.md, ROADMAP.md (Phase D → 0-8), docs/RESEARCH.md (verified facts, cite instead of re-searching).
- D1: React Router 7 + Prisma/SQLite app in `reviewos/`, full schema, services (`app/services/`), JSON APIs, multi-category seed (3 products, ~90 reviews). Verified.
- D2: framework-free widget bundle (`widget/` → `public/widget/reviewos.js`), blocks: summary, distribution bars, dynamic filter chips (URL-synced), feed, write-review modal. Demo pages `/demo/:slug` + index `/`. Verified in headless browser after fixing widget-mount vs React-hydration race (commit 5e7e2d7). User has seen it working.

## In progress
- Nothing mid-file. Next milestone not started.

## Next
- D3: Groq AI service — provider-pluggable `app/services/ai/`, overall + filter-aware cohort + per-marketplace summaries (DB-cached in AiSummary model, threshold-gated, NEVER per-page-load), ai-summary widget block, one-click AI demo-review generator in a minimal `/admin`. Exit: summary changes when filter chips clicked.
- D4: marketplace trust badges block + UGC gallery with lightbox (data/models already seeded).
- D5: design polish (impeccable / frontend-design skill) + deploy to Vercel/Render free tier, shareable URL.
- After Phase D: stakeholder feedback → Shopify phases per ROADMAP.md.

## Gotchas
- Run: `cd reviewos && npm run dev` → http://localhost:5173/demo/glow-lab-vitamin-c-serum (kill stale: `lsof -ti:5173 | xargs kill`).
- Env: GROQ_API_KEY in `reviewos/.env` (present; user must ROTATE it post-demo, it was exposed in chat). DATABASE_URL is relative to prisma/ ("file:./dev.db").
- Widget must mount after React hydration (window.load in widget/src/index.ts) — do not "simplify" back to DOMContentLoaded, it breaks everything silently.
- Reseed: `npm run seed`. Typecheck: `npm run typecheck`. Playwright is installed for headless verification (screenshots + console errors).
- Follow CLAUDE.md orchestration policy: delegate builds to sonnet subagents with full cold-start specs, verify their claims yourself, update this file after each milestone.
