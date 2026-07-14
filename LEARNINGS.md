# LEARNINGS.md — hard-won lessons from the Phase D build (2026-07-14/15)

Read this before making changes. Every item here cost real debugging time.

## Architecture traps (will bite again in the Shopify port)

1. **Never let a framework-free widget self-mount into a React-owned div.**
   The widget mounted on `window.load`; React hydration finishing later wiped it, so customers saw no reviews, but only in prod (locally hydration always won the race). Fix that stuck: host page marks the div `data-reviewos-manual` and calls `window.ReviewOS.mount()` from `useEffect`; the mount is idempotent keyed off DOM presence (`.rvos-widget` child), not a data-attribute flag (flags survive wipes and block remounts). Plain non-React embeds still auto-mount. The Shopify Theme App Extension embed is non-React, so auto-mount path must keep working.

2. **Inline `onclick="event.stopPropagation()"` breaks delegated event handling.**
   The whole widget uses one delegated click listener on the root. Someone (an agent) added stopPropagation inside the modal to stop backdrop-close from firing on inner clicks; that silently killed the star picker and close button, meaning NO review could ever be submitted, and it passed several "modal opens" verifications. Correct pattern: backdrop elements get a guard in the delegated handler (`if (isBackdrop && evt.target !== target) return`), never stopPropagation.

3. **`esc()` (HTML entity escaping) is NOT safe inside a JS-string-in-attribute context** (`onerror="...'${esc(x)}'..."`), because the browser decodes entities before the JS parses. Never interpolate data into inline handlers; pre-render a hidden fallback sibling and toggle it with static JS.

4. **`history.replaceState` for filter URL sync makes the Back button exit the page.** Users expect Back to undo a filter. Use `pushState` per user-driven change plus a `popstate` handler that re-reads the URL and refetches.

5. **Prisma cannot switch datasource provider per environment.** "SQLite in dev, Postgres in prod" is not a real option with one schema. We moved everything (local dev included) to Neon Postgres. Old sqlite migrations were deleted; schema is managed with `prisma db push` + seed. If migration history is needed later, re-baseline on Postgres.

## Ops / deploy traps

6. **Piping a secret into `vercel env add` leaves a trailing newline in the value.** Every Groq fetch then threw `TypeError: Headers ...` and the API 500'd. Use `printf '%s'`, never `echo | `.
7. `@vercel/react-router` preset only supports React Router 7; this app is on 8. Zero-config Vercel detection works, use that. Re-check the preset when it supports RR8.
8. `vercel install neon` needs `--plan free_v3` (not `free`) and a one-time browser terms acceptance by the user.
9. Vite dev server aborts in-flight widget fetches on its first-load dependency-optimization reload, producing a one-off `[reviewos] init failed TypeError: Failed to fetch`. Dev-only noise; does not happen in prod. Don't chase it again.

## Process lessons (agent orchestration)

10. **"Verified" from a subagent means "the checks it thought of passed."** The write-review modal was reported working in D2, D4, and D5 verification passes because they only checked "modal opens." The bug was found only by a QA agent told to exercise every interaction end-to-end (click each star, submit, check the value). Verification prompts must enumerate interactions, not features.
11. **A bug that reproduces once in prod and never locally is still a real bug.** The mount wipe showed up in 1 of ~10 live loads and no local runs. The root cause was reasoned from evidence (trust-badge image requests fired, DOM empty after), not from a reliable repro. Timing-dependent races deserve an architectural fix, not more retries of the repro.
12. Session limits kill background agents mid-task; their partial edits stay in the working tree. Always `git status && git diff` after an agent dies before assuming anything about repo state.
13. Static-audit agent + live-QA agent in parallel find disjoint bug sets (audit found API validation holes QA couldn't see; QA found the dead modal the audit's code-reading missed because the stopPropagation looked intentional). Use both for any "find bugs" request.

## Data / demo state

14. The live demo shares one Neon DB with local dev. Submitted reviews persist for everyone; a "QA TEST - ignore" review sits in the moderation queue (status pending). Reseeding (`npm run seed`) wipes and rebuilds everything including AI summary cache (regenerated on demand, cached in AiSummary).
15. GROQ_API_KEY was exposed in chat earlier and is now in Vercel prod env. ROTATE it at console.groq.com, then `vercel env rm/add` (with printf!) and redeploy.
