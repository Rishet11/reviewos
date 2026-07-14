import { mountShopifyBlock } from "./mount";

// Same idempotency pattern as the demo widget's index.ts: keyed off the
// presence of DOM the mount function produced (not a flag attribute), so a
// host wiped by the theme editor's section re-render can still be remounted.
// The Theme App Extension embed is plain Liquid/JS (no framework wraps it),
// so a straightforward DOMContentLoaded auto-mount is safe here; there is no
// hydration to race against (see LEARNINGS.md #1).
function mountHost(el: HTMLElement) {
  if (el.dataset.reviewosMounted === "true") return;
  el.dataset.reviewosMounted = "true";
  mountShopifyBlock(el);
}

function mountAll() {
  document.querySelectorAll<HTMLElement>("[data-reviewos]").forEach(mountHost);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountAll);
} else {
  mountAll();
}
