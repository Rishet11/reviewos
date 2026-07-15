// Mounts a single Theme App Extension block. Each block is its own isolated
// [data-reviewos] host (Shopify app blocks render independently in Liquid;
// there is no shared JS scope between them). Cross-block coordination (e.g.
// filter-chips changing what review-feed shows) happens through the URL
// query string, using the same readFiltersFromUrl/writeFiltersToUrl helpers
// the demo widget already uses for back-button support, plus a
// "reviewos:filters-changed" window event so blocks on the same page refetch
// without a full page reload.
import { createStore } from "../store";
import { readFiltersFromUrl, writeFiltersToUrl } from "../url";
import { renderSummary } from "../blocks/summary";
import { renderDistribution } from "../blocks/distribution";
import { renderFeed } from "../blocks/feed";
import { renderFilters } from "../blocks/filters";
import { renderWriteModal } from "../blocks/write";
import { renderAiSummary } from "../blocks/ai-summary";
import { renderTrustBadges } from "../blocks/trust-badges";
import {
  fetchAttributes,
  fetchDistribution,
  fetchMarketplaceStats,
  fetchReviews,
  fetchSummary,
  postReview,
} from "./api";
import type { WidgetState } from "../types";

const FILTERS_CHANGED_EVENT = "reviewos:filters-changed";
const DEFAULT_API_BASE = "/apps/reviewos";
const DEFAULT_PAGE_SIZE = 5;

function blankState(productId: string, pageSize: number): WidgetState {
  return {
    apiBase: "",
    productSlug: productId,
    blocks: new Set(),
    loading: true,
    error: null,
    product: null,
    summary: null,
    attributeDefs: [],
    aiSummary: null,
    aiSummaryLoading: false,
    marketplaceStats: [],
    lightboxIndex: null,
    lightboxReturnIndex: null,
    galleryReviews: [],
    reviews: [],
    total: 0,
    page: 1,
    pageSize,
    reviewsLoading: false,
    votedIds: {},
    ratingFilter: null,
    attrFilters: {},
    sort: "recent",
    writeOpen: false,
    writeRating: 0,
    writeSubmitting: false,
    writeSuccess: false,
    writeError: null,
  };
}

export function mountShopifyBlock(el: HTMLElement) {
  const blockType = el.dataset.block;
  // Proxy routes resolve products by slug (product.handle), not the numeric
  // Shopify product id. data-product-id is kept as a fallback only.
  const productId = el.dataset.productHandle || el.dataset.productId;
  if (!blockType || !productId) {
    console.error("[reviewos] missing data-block or data-product-handle");
    return;
  }
  const apiBase = (el.dataset.apiBase || DEFAULT_API_BASE).replace(/\/$/, "");
  const pageSize = Number(el.dataset.pageSize) || DEFAULT_PAGE_SIZE;

  const store = createStore(blankState(productId, pageSize));
  const { attrFilters, rating, sort } = readFiltersFromUrl(store.getState().attributeDefs);
  store.setState({ attrFilters, ratingFilter: rating, sort });

  function render() {
    const state = store.getState();
    if (state.loading) {
      el.innerHTML = `<div class="rvos-loading">Loading reviews…</div>`;
      return;
    }
    if (state.error) {
      el.innerHTML = `<div class="rvos-error">Couldn't load reviews. Please try again later.</div>`;
      return;
    }
    switch (blockType) {
      case "star-badge":
        el.innerHTML = renderSummary(state);
        break;
      case "rating-distribution":
        el.innerHTML = renderDistribution(state);
        break;
      case "review-feed":
        el.innerHTML = renderFeed(state);
        break;
      case "filter-chips":
        el.innerHTML = renderFilters(state);
        break;
      case "write-review":
        el.innerHTML =
          `<button type="button" class="rvos-btn rvos-btn--primary" data-action="open-write">Write a review</button>` +
          renderWriteModal(state);
        break;
      case "ai-summary":
        el.innerHTML = renderAiSummary(state);
        break;
      case "trust-badges":
        el.innerHTML = renderTrustBadges(state);
        break;
      default:
        el.innerHTML = "";
    }
  }
  store.subscribe(render);

  let reviewsSeq = 0;
  async function loadReviews(reset: boolean) {
    const state = store.getState();
    const seq = ++reviewsSeq;
    store.setState({ reviewsLoading: true });
    try {
      const result = await fetchReviews(apiBase, {
        productId,
        rating: state.ratingFilter,
        attrFilters: state.attrFilters,
        sort: state.sort,
        page: reset ? 1 : state.page,
        pageSize,
      });
      if (seq !== reviewsSeq) return;
      const prev = reset ? [] : store.getState().reviews;
      store.setState({
        reviews: [...prev, ...result.reviews],
        total: result.total,
        page: result.page,
        reviewsLoading: false,
      });
    } catch {
      if (seq !== reviewsSeq) return;
      store.setState({ reviewsLoading: false, error: "reviews_failed" });
    }
  }

  let aiSummarySeq = 0;
  async function loadAiSummary() {
    const seq = ++aiSummarySeq;
    store.setState({ aiSummaryLoading: true });
    try {
      const summary = await fetchSummary(apiBase, productId, store.getState().attrFilters);
      if (seq !== aiSummarySeq) return;
      store.setState({ aiSummary: summary, aiSummaryLoading: false });
    } catch {
      if (seq !== aiSummarySeq) return;
      store.setState({ aiSummary: null, aiSummaryLoading: false });
    }
  }

  async function refetch() {
    if (blockType === "review-feed") await loadReviews(true);
    if (blockType === "ai-summary") await loadAiSummary();
  }

  function onFiltersChanged() {
    const restored = readFiltersFromUrl(store.getState().attributeDefs);
    store.setState({
      attrFilters: restored.attrFilters,
      ratingFilter: restored.rating,
      sort: restored.sort,
    });
    void refetch();
  }
  window.addEventListener("popstate", onFiltersChanged);
  window.addEventListener(FILTERS_CHANGED_EVENT, onFiltersChanged);

  function pushFilters(push = true) {
    const state = store.getState();
    writeFiltersToUrl(state.attrFilters, state.ratingFilter, state.sort, push);
    window.dispatchEvent(new Event(FILTERS_CHANGED_EVENT));
  }

  el.addEventListener("click", async (evt) => {
    const target = (evt.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target) return;
    const action = target.dataset.action;

    const isBackdrop = target.classList.contains("rvos-modal-overlay");
    if (isBackdrop && evt.target !== target) return;

    if (action === "filter-rating") {
      const value = target.dataset.rating;
      const rating = value ? Number(value) : null;
      const current = store.getState().ratingFilter;
      store.setState({ ratingFilter: current === rating ? null : rating });
      pushFilters();
      await refetch();
      return;
    }
    if (action === "toggle-filter") {
      const key = target.dataset.key!;
      const value = target.dataset.value!;
      const current = { ...store.getState().attrFilters };
      if (current[key] === value) delete current[key];
      else current[key] = value;
      store.setState({ attrFilters: current });
      pushFilters();
      await refetch();
      return;
    }
    if (action === "clear-filters") {
      store.setState({ attrFilters: {}, ratingFilter: null });
      pushFilters();
      await refetch();
      return;
    }
    if (action === "load-more") {
      if (store.getState().reviewsLoading) return;
      store.setState({ page: store.getState().page + 1 });
      await loadReviews(false);
      return;
    }
    if (action === "open-write") {
      store.setState({ writeOpen: true, writeSuccess: false, writeError: null, writeRating: 0 });
      return;
    }
    if (action === "close-write") {
      store.setState({ writeOpen: false });
      return;
    }
    if (action === "set-write-rating") {
      store.setState({ writeRating: Number(target.dataset.value) });
      return;
    }
  });

  el.addEventListener("change", async (evt) => {
    const target = evt.target as HTMLElement;
    if (target.dataset.action === "set-sort") {
      store.setState({ sort: (target as HTMLSelectElement).value as WidgetState["sort"] });
      pushFilters();
      await refetch();
    }
  });

  el.addEventListener("submit", async (evt) => {
    const form = evt.target as HTMLFormElement;
    if (form.dataset.action !== "submit-write") return;
    evt.preventDefault();

    const state = store.getState();
    if (state.writeRating < 1) {
      store.setState({ writeError: "Please select a star rating." });
      return;
    }
    const formData = new FormData(form);
    const attributes: Record<string, string> = {};
    for (const def of state.attributeDefs) {
      const value = formData.get(`attr__${def.key}`);
      if (typeof value === "string" && value) attributes[def.key] = value;
    }
    store.setState({ writeSubmitting: true, writeError: null });
    try {
      await postReview(apiBase, {
        productId,
        customerName: String(formData.get("customerName") ?? ""),
        rating: state.writeRating,
        title: String(formData.get("title") ?? "") || undefined,
        body: String(formData.get("body") ?? ""),
        attributes,
      });
      store.setState({ writeSubmitting: false, writeSuccess: true });
    } catch (err) {
      store.setState({
        writeSubmitting: false,
        writeError: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  });

  async function init() {
    try {
      const needsSummary = blockType === "star-badge" || blockType === "rating-distribution";
      const needsAttrs = blockType === "filter-chips" || blockType === "write-review";
      const needsReviews = blockType === "review-feed";
      const needsAiSummary = blockType === "ai-summary";
      const needsMarketplace = blockType === "trust-badges";

      // Rating stats (average/count/byStar) come from /distribution only.
      // /summary is the separate AI text summary and is not wired into any
      // block yet.
      const [distribution, attributeDefs, marketplaceStats] = await Promise.all([
        needsSummary ? fetchDistribution(apiBase, productId) : Promise.resolve(null),
        needsAttrs ? fetchAttributes(apiBase, productId) : Promise.resolve([]),
        needsMarketplace ? fetchMarketplaceStats(apiBase, productId) : Promise.resolve([]),
      ]);

      store.setState({
        summary: distribution
          ? { average: distribution.average, count: distribution.count, byStar: distribution.byStar }
          : null,
        attributeDefs,
        marketplaceStats,
        loading: false,
      });

      if (needsReviews) await loadReviews(true);
      if (needsAiSummary) await loadAiSummary();
    } catch (err) {
      console.error("[reviewos] shopify block init failed", err);
      store.setState({ loading: false, error: "init_failed" });
    }
  }

  render();
  init();
}
