# STATE — ReviewOS

_Last updated: 2026-07-14_

## Where we are
- Scope decided: real sellable product (not demo), built in phases per ROADMAP.md.
- Research complete → docs/RESEARCH.md (Shopify stack, App Store rules, competitors, marketplace-sourcing legal verdict: NO scraping, merchant-owned CSV/manual data only, hosting: Render+Postgres+R2).
- Docs written: CLAUDE.md, PRD.md, ROADMAP.md, docs/RESEARCH.md, STATE.md.
- Shopify CLI 4.5.0 installed; Node v26.5 OK. No code yet — Phase 0 blockers below, then Phase 1 scaffold.
- Decision (2026-07-14): marketplace data is dual-mode. Default merchant-owned (manual + CSV); optional flag-gated live-fetch connector (BYO third-party API key, Phase 5b) — stakeholder insisted despite disclosed ToS/legal risk (PRD "Live fetch risk").
- Phase 5b live-fetch code is excluded from App Store submission builds (review finding, 2026-07-14).
- Delegation policy: this session orchestrates; implementation goes to subagents (haiku → sonnet → opus escalation, see CLAUDE.md).

## Course change (2026-07-14)
- Build order: **standalone demo website first (Phase D)**, Shopify app after stakeholder buy-in. Portability rules in CLAUDE.md guarantee reuse.
- AI provider: **Groq** (free, OpenAI-compatible) instead of Anthropic; pluggable provider interface.
- Shopify account: user reports created (unverified). Shopify CLI 4.5.0 installed.

## Blockers (user must do)
1. For D3: free Groq API key (console.groq.com) → `reviewos/.env` as `GROQ_API_KEY`. Not needed for D1/D2.
2. For Phase 0 later: confirm development store exists in the Shopify Dev Dashboard.

## Next actions
1. Phase D milestone D1: skeleton app + schema + seed in `reviewos/`.
2. Then D2 widget core. One milestone at a time; update this file after each.
