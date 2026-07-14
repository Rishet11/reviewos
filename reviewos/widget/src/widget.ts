import { createStore } from "./store";
import {
  fetchAiSummary,
  fetchAttributes,
  fetchMarketplaceStats,
  fetchProduct,
  fetchReviews,
  fetchSummary,
  postHelpful,
  postReview,
} from "./api";
import { renderAiSummary } from "./blocks/ai-summary";
import { renderSummary } from "./blocks/summary";
import { renderTrustBadges } from "./blocks/trust-badges";
import { renderDistribution } from "./blocks/distribution";
import { renderFilters } from "./blocks/filters";
import { getGalleryPhotos, renderLightbox, renderUgcGallery } from "./blocks/ugc-gallery";
import { renderFeed } from "./blocks/feed";
import { renderWriteModal } from "./blocks/write";
import { readFiltersFromUrl, writeFiltersToUrl } from "./url";
import type { WidgetState } from "./types";

const ALL_BLOCKS = [
  "ai-summary",
  "summary",
  "trust-badges",
  "distribution",
  "filters",
  "ugc-gallery",
  "feed",
  "write",
];
const PAGE_SIZE = 5;

export function mountWidget(el: HTMLElement) {
  const productSlugAttr = el.dataset.product;
  if (!productSlugAttr) {
    console.error("[reviewos] missing data-product attribute");
    return;
  }
  const productSlug: string = productSlugAttr;
  const apiBase = (el.dataset.api ?? "").replace(/\/$/, "");
  const blockList = (el.dataset.blocks ?? ALL_BLOCKS.join(","))
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);
  const blocks = new Set(blockList);

  const initial: WidgetState = {
    apiBase,
    productSlug,
    blocks,
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
    pageSize: PAGE_SIZE,
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

  const store = createStore(initial);

  el.innerHTML = `<div class="rvos-widget"></div>`;
  const root = el.querySelector<HTMLDivElement>(".rvos-widget")!;

  function render() {
    const state = store.getState();

    if (state.loading) {
      root.innerHTML = `<div class="rvos-loading">Loading reviews…</div>`;
      return;
    }
    if (state.error) {
      root.innerHTML = `<div class="rvos-error">Couldn't load reviews. Please try again later.</div>`;
      return;
    }

    const sections: string[] = [];
    if (state.blocks.has("ai-summary")) sections.push(renderAiSummary(state));
    if (state.blocks.has("summary")) sections.push(renderSummary(state));
    if (state.blocks.has("trust-badges")) sections.push(renderTrustBadges(state));
    if (state.blocks.has("distribution")) sections.push(renderDistribution(state));
    if (state.blocks.has("filters")) sections.push(renderFilters(state));
    if (state.blocks.has("ugc-gallery")) sections.push(renderUgcGallery(state));
    if (state.blocks.has("feed")) sections.push(renderFeed(state));

    root.innerHTML =
      sections.join("") +
      (state.blocks.has("write") ? renderWriteModal(state) : "") +
      renderLightbox(state);

    if (pendingFocusIndex !== null) {
      const idx = pendingFocusIndex;
      pendingFocusIndex = null;
      const el = root.querySelector<HTMLElement>(`[data-photo-index="${idx}"]`);
      el?.focus();
    } else if (state.lightboxIndex !== null && prevLightboxIndex === null) {
      // Move focus into the dialog when it opens (keyboard/screen-reader
      // users land inside it; Escape and arrows already work globally).
      root.querySelector<HTMLElement>(".rvos-lightbox")?.focus();
    }
    prevLightboxIndex = state.lightboxIndex;
  }

  // Set right before a re-render that closes the lightbox, so focus can be
  // restored to the thumbnail that opened it (its DOM node was replaced by
  // the innerHTML re-render, so we re-query for it by index after render).
  let pendingFocusIndex: number | null = null;
  let prevLightboxIndex: number | null = null;

  store.subscribe(render);

  // Monotonic request id: only the latest in-flight fetch may write results,
  // so rapid filter/sort changes can't be clobbered by a stale response.
  let fetchSeq = 0;

  async function loadReviews(reset: boolean) {
    const state = store.getState();
    const seq = ++fetchSeq;
    store.setState({ reviewsLoading: true });
    try {
      const result = await fetchReviews(apiBase, {
        productSlug,
        rating: state.ratingFilter,
        attrFilters: state.attrFilters,
        sort: state.sort,
        page: reset ? 1 : state.page,
        pageSize: PAGE_SIZE,
      });
      if (seq !== fetchSeq) return; // stale response, a newer request is in flight
      const prevReviews = reset ? [] : store.getState().reviews;
      store.setState({
        reviews: [...prevReviews, ...result.reviews],
        total: result.total,
        page: result.page,
        reviewsLoading: false,
      });
    } catch {
      if (seq !== fetchSeq) return;
      store.setState({ reviewsLoading: false, error: "reviews_failed" });
    }
  }

  // Gallery pulls photos from all reviews matching the current filters, not
  // just the visible feed page, so it fetches separately with a large page.
  let gallerySeq = 0;

  async function loadGallery() {
    if (!store.getState().blocks.has("ugc-gallery")) return;
    const state = store.getState();
    const seq = ++gallerySeq;
    try {
      const result = await fetchReviews(apiBase, {
        productSlug,
        rating: state.ratingFilter,
        attrFilters: state.attrFilters,
        sort: state.sort,
        page: 1,
        pageSize: 200,
      });
      if (seq !== gallerySeq) return;
      store.setState({ galleryReviews: result.reviews });
    } catch {
      if (seq !== gallerySeq) return;
      store.setState({ galleryReviews: [] });
    }
  }

  // Separate seq counter from reviews: filter changes trigger both fetches,
  // but they resolve independently and shouldn't clobber each other.
  let aiSummarySeq = 0;

  async function loadAiSummary() {
    if (!store.getState().blocks.has("ai-summary")) return;
    const seq = ++aiSummarySeq;
    store.setState({ aiSummaryLoading: true });
    try {
      const summary = await fetchAiSummary(apiBase, productSlug, store.getState().attrFilters);
      if (seq !== aiSummarySeq) return;
      store.setState({ aiSummary: summary, aiSummaryLoading: false });
    } catch {
      if (seq !== aiSummarySeq) return;
      store.setState({ aiSummary: null, aiSummaryLoading: false });
    }
  }

  async function refetchFiltered(writeUrl = true) {
    if (store.getState().lightboxIndex !== null) {
      store.setState({ lightboxIndex: null, lightboxReturnIndex: null });
    }
    if (writeUrl) {
      // Each user-driven filter/sort change pushes a history entry so the
      // browser Back button steps back through filter states instead of
      // leaving the page.
      writeFiltersToUrl(
        store.getState().attrFilters,
        store.getState().ratingFilter,
        store.getState().sort,
        true
      );
    }
    await Promise.all([loadReviews(true), loadAiSummary(), loadGallery()]);
  }

  window.addEventListener("popstate", () => {
    const restored = readFiltersFromUrl(store.getState().attributeDefs);
    store.setState({
      attrFilters: restored.attrFilters,
      ratingFilter: restored.rating,
      sort: restored.sort,
    });
    void refetchFiltered(false);
  });

  async function init() {
    try {
      const product = await fetchProduct(apiBase, productSlug);
      const [summary, attributeDefs] = await Promise.all([
        fetchSummary(apiBase, productSlug),
        fetchAttributes(apiBase, product.category),
      ]);

      const restored = readFiltersFromUrl(attributeDefs);

      store.setState({
        product,
        summary,
        attributeDefs,
        ratingFilter: restored.rating,
        attrFilters: restored.attrFilters,
        sort: restored.sort,
        loading: false,
      });

      if (store.getState().blocks.has("trust-badges")) {
        fetchMarketplaceStats(apiBase, productSlug)
          .then((stats) => store.setState({ marketplaceStats: stats }))
          .catch(() => store.setState({ marketplaceStats: [] }));
      }

      await Promise.all([loadReviews(true), loadAiSummary(), loadGallery()]);
    } catch (err) {
      console.error("[reviewos] init failed", err);
      store.setState({ loading: false, error: "init_failed" });
    }
  }

  root.addEventListener("click", async (evt) => {
    const target = (evt.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target) return;
    const action = target.dataset.action;

    // Backdrop elements (modal overlay, lightbox root) carry a close action
    // that must only fire on a direct backdrop click. Inner clicks bubble up
    // to them via closest(), so without this guard any click inside the
    // dialog would close it (the old inline stopPropagation "fix" for that
    // broke every delegated action inside the dialog instead).
    const isBackdrop =
      target.classList.contains("rvos-modal-overlay") ||
      target.classList.contains("rvos-lightbox");
    if (isBackdrop && evt.target !== target) return;

    if (action === "filter-rating") {
      const value = target.dataset.rating;
      const rating = value ? Number(value) : null;
      const current = store.getState().ratingFilter;
      store.setState({ ratingFilter: current === rating ? null : rating });
      await refetchFiltered();
      return;
    }

    if (action === "toggle-filter") {
      const key = target.dataset.key!;
      const value = target.dataset.value!;
      const current = { ...store.getState().attrFilters };
      if (current[key] === value) {
        delete current[key];
      } else {
        current[key] = value;
      }
      store.setState({ attrFilters: current });
      await refetchFiltered();
      return;
    }

    if (action === "clear-filters") {
      store.setState({ attrFilters: {}, ratingFilter: null });
      await refetchFiltered();
      return;
    }

    if (action === "load-more") {
      if (store.getState().reviewsLoading) return;
      store.setState({ page: store.getState().page + 1 });
      await loadReviews(false);
      return;
    }

    if (action === "vote-helpful") {
      const reviewId = target.dataset.reviewId!;
      const state = store.getState();
      if (state.votedIds[reviewId]) return;
      store.setState({
        votedIds: { ...state.votedIds, [reviewId]: true },
        reviews: state.reviews.map((r) =>
          r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r
        ),
      });
      try {
        await postHelpful(apiBase, reviewId);
      } catch {
        // optimistic update stays; server failure is non-critical for demo
      }
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

    if (action === "open-lightbox") {
      const idx = Number(target.dataset.photoIndex);
      store.setState({ lightboxIndex: idx, lightboxReturnIndex: idx });
      return;
    }

    if (action === "close-lightbox") {
      pendingFocusIndex = store.getState().lightboxReturnIndex;
      store.setState({ lightboxIndex: null, lightboxReturnIndex: null });
      return;
    }

    if (action === "lightbox-prev") {
      const current = store.getState().lightboxIndex;
      if (current !== null && current > 0) store.setState({ lightboxIndex: current - 1 });
      return;
    }

    if (action === "lightbox-next") {
      const state = store.getState();
      const total = getGalleryPhotos(state).length;
      if (state.lightboxIndex !== null && state.lightboxIndex < total - 1) {
        store.setState({ lightboxIndex: state.lightboxIndex + 1 });
      }
      return;
    }
  });

  document.addEventListener("keydown", (evt) => {
    const state = store.getState();
    if (state.lightboxIndex === null) return;

    if (evt.key === "Escape") {
      pendingFocusIndex = state.lightboxReturnIndex;
      store.setState({ lightboxIndex: null, lightboxReturnIndex: null });
    } else if (evt.key === "ArrowLeft") {
      if (state.lightboxIndex > 0) store.setState({ lightboxIndex: state.lightboxIndex - 1 });
    } else if (evt.key === "ArrowRight") {
      const total = getGalleryPhotos(state).length;
      if (state.lightboxIndex < total - 1) {
        store.setState({ lightboxIndex: state.lightboxIndex + 1 });
      }
    }
  });

  root.addEventListener("change", async (evt) => {
    const target = evt.target as HTMLElement;
    if (target.dataset.action === "set-sort") {
      const value = (target as HTMLSelectElement).value as WidgetState["sort"];
      store.setState({ sort: value });
      await refetchFiltered();
    }
  });

  root.addEventListener("submit", async (evt) => {
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
        productSlug,
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

  render();
  init();
}
