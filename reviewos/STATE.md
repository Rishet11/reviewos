# State

## D2 fix (2026-07-14)
Review widget wasn't rendering on /demo/:slug pages because its auto-mount script ran on DOMContentLoaded, before React finished hydrating the SSR'd host div — React detected the mismatch, discarded the widget's injected DOM, and the mount-guard flag prevented it from ever remounting.
Fix: widget now waits for `window.load` before mounting (widget/src/index.ts), rebuilt into public/widget/reviewos.js. The "second product below" symptom did not reproduce in clean loads or client-side nav between products; only the missing-widget bug was confirmed via console/hydration errors.
