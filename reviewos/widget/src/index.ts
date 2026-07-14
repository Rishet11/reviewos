import { mountWidget } from "./widget";

type MountFn = (host?: HTMLElement) => void;

declare global {
  interface Window {
    ReviewOS?: { mount: MountFn };
    ReviewOSQueue?: Array<() => void>;
  }
}

// Idempotency is keyed off the actual DOM (does the host still contain a
// `.rvos-widget` node?) rather than a data-attribute flag. A flag would
// survive on the host element even after a framework wipes its children
// (e.g. React re-rendering the subtree that owns this div), permanently
// blocking any future remount attempt. Checking the DOM directly means a
// host that gets wiped is correctly seen as "not mounted" and can be
// remounted on the next call.
function mountHost(el: HTMLElement) {
  if (el.querySelector(".rvos-widget")) return;
  mountWidget(el);
}

function mountAll(host?: HTMLElement) {
  if (host) {
    mountHost(host);
    return;
  }
  document.querySelectorAll<HTMLElement>("[data-reviewos]").forEach(mountHost);
}

// Like mountAll, but skips hosts marked data-reviewos-manual. Framework pages
// (React/Vue) set that attribute and call window.ReviewOS.mount() themselves
// after hydration; if auto-mount touched their host first it could run before
// hydration finishes, injecting DOM the server never rendered. That triggers
// a hydration mismatch, and the framework's recovery re-render wipes the
// widget (the original production bug).
function autoMountAll() {
  document
    .querySelectorAll<HTMLElement>("[data-reviewos]:not([data-reviewos-manual])")
    .forEach(mountHost);
}

// Exposed so host pages that manage the container div themselves (e.g. a
// React/Vue app rendering `<div data-reviewos>` from JSX) can explicitly
// mount after their own hydration/render has settled, instead of racing this
// script's auto-mount below. Safe to call repeatedly: mountHost no-ops if
// the widget is already present, and remounts if it was wiped.
window.ReviewOS = { mount: mountAll };

// Flush any mount calls that were queued by a host page before this script
// finished loading (see the queue pattern used by app/routes/demo.$slug.tsx).
if (window.ReviewOSQueue) {
  const queued = window.ReviewOSQueue;
  window.ReviewOSQueue = [];
  queued.forEach((fn) => fn());
}

// Auto-mount fallback for plain (non-framework) embeds that never call
// window.ReviewOS.mount() themselves. Uses the same DOM-based guard, so even
// if a framework host also calls mount() independently, only one mount ever
// lands.
function scheduleAutoMount() {
  if (document.readyState === "complete") {
    autoMountAll();
  } else {
    window.addEventListener("load", () => autoMountAll(), { once: true });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scheduleAutoMount);
} else {
  scheduleAutoMount();
}
