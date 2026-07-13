import { mountWidget } from "./widget";

function mountAll() {
  const hosts = document.querySelectorAll<HTMLElement>("[data-reviewos]");
  hosts.forEach((el) => {
    if (el.dataset.reviewosMounted) return;
    el.dataset.reviewosMounted = "true";
    mountWidget(el);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountAll);
} else {
  mountAll();
}
