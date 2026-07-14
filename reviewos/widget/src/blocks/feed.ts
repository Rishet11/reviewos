import type { Review, WidgetState } from "../types";
import { esc, formatDate, stars } from "../helpers";

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "recent", label: "Most recent" },
  { value: "helpful", label: "Most helpful" },
  { value: "rating_desc", label: "Highest rating" },
  { value: "rating_asc", label: "Lowest rating" },
];

function renderCard(review: Review, voted: boolean): string {
  const badges = [
    review.verifiedBuyer ? `<span class="rvos-badge">Verified buyer</span>` : "",
    review.verifiedMarketplace
      ? `<span class="rvos-badge rvos-badge--marketplace">Verified marketplace</span>`
      : "",
  ].join("");

  const media = review.media.length
    ? `<div class="rvos-card__media">${review.media
        .map(
          (m) =>
            `<img class="rvos-card__thumb" src="${esc(m.url)}" alt="review media" loading="lazy" />`
        )
        .join("")}</div>`
    : "";

  const reply = review.merchantReply
    ? `<div class="rvos-card__reply">
        <div class="rvos-card__reply-label">Merchant reply</div>
        <div>${esc(review.merchantReply)}</div>
      </div>`
    : "";

  return `
    <article class="rvos-card" data-review-id="${esc(review.id)}">
      <div class="rvos-card__head">
        <div class="rvos-stars">${stars(review.rating)}</div>
        <div class="rvos-card__author">${esc(review.customerName)}</div>
        ${badges}
        <div class="rvos-card__date">${formatDate(review.createdAt)}</div>
      </div>
      ${review.title ? `<h4 class="rvos-card__title">${esc(review.title)}</h4>` : ""}
      <p class="rvos-card__body">${esc(review.body)}</p>
      ${media}
      ${reply}
      <button type="button" class="rvos-helpful" data-action="vote-helpful" data-review-id="${esc(review.id)}" ${voted ? "disabled" : ""}>
        Helpful (<span class="rvos-helpful__count">${review.helpfulCount}</span>)
      </button>
    </article>
  `;
}

export function renderFeed(state: WidgetState): string {
  const sortOptions = SORT_OPTIONS.map(
    (opt) =>
      `<option value="${opt.value}" ${state.sort === opt.value ? "selected" : ""}>${opt.label}</option>`
  ).join("");

  const toolbar = `
    <div class="rvos-feed__toolbar">
      <span class="rvos-feed__total">${state.total.toLocaleString()} review${state.total === 1 ? "" : "s"}</span>
      <select class="rvos-select" data-action="set-sort">${sortOptions}</select>
    </div>
  `;

  if (state.reviewsLoading && state.reviews.length === 0) {
    return `${toolbar}<div class="rvos-feed__loading">Loading reviews…</div>`;
  }

  if (state.reviews.length === 0) {
    return `${toolbar}<div class="rvos-empty">No reviews match your filters yet.</div>`;
  }

  const cards = state.reviews
    .map((review) => renderCard(review, Boolean(state.votedIds[review.id])))
    .join("");
  const hasMore = state.page * state.pageSize < state.total;
  const loadMore = hasMore
    ? `<button type="button" class="rvos-btn rvos-btn--outline rvos-feed__load-more" data-action="load-more" ${state.reviewsLoading ? "disabled" : ""}>
        ${state.reviewsLoading ? "Loading…" : "Load more"}
      </button>`
    : "";

  return `${toolbar}<div class="rvos-feed__list">${cards}</div>${loadMore}`;
}
