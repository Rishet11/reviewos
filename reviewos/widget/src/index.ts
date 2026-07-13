import { mountWidget } from "./widget";

function mountAll() {
  const hosts = document.querySelectorAll<HTMLElement>("[data-reviewos]");
  hosts.forEach((el) => {
    if (el.dataset.reviewosMounted) return;
    el.dataset.reviewosMounted = "true";
    mountWidget(el);
  });
}

// Host pages that hydrate their own SSR'd HTML (e.g. React/Vue apps) may still
// be reconciling the DOM when this script runs. Mounting into a host div
// before hydration finishes causes a hydration mismatch: the framework
// discards our injected content when it regenerates the subtree, and since
// we already flagged the (now-replaced) node as mounted, the widget never
// reappears. Deferring to `window.load` (fires after hydration in practice,
// since it waits on all subresources) avoids the race.
function scheduleMountAll() {
  if (document.readyState === "complete") {
    mountAll();
  } else {
    window.addEventListener("load", mountAll, { once: true });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scheduleMountAll);
} else {
  scheduleMountAll();
}
