import type { WidgetState } from "../types";
import { esc } from "../helpers";

export function renderDistribution(state: WidgetState): string {
  const summary = state.summary;
  if (!summary || summary.count === 0) return "";

  const rows = [5, 4, 3, 2, 1]
    .map((star) => {
      const count = summary.byStar[String(star)] ?? 0;
      const pct = summary.count > 0 ? Math.round((count / summary.count) * 100) : 0;
      const active = state.ratingFilter === star;
      return `
        <button type="button" class="rvos-dist-row ${active ? "rvos-dist-row--active" : ""}" data-action="filter-rating" data-rating="${star}">
          <span class="rvos-dist-row__label">${star}&#9733;</span>
          <span class="rvos-dist-row__bar"><span class="rvos-dist-row__fill" style="width:${pct}%"></span></span>
          <span class="rvos-dist-row__count">${count}</span>
        </button>
      `;
    })
    .join("");

  const clear = state.ratingFilter
    ? `<button type="button" class="rvos-link" data-action="filter-rating" data-rating="">Clear rating filter (${esc(state.ratingFilter)}&#9733;)</button>`
    : "";

  return `<div class="rvos-distribution">${rows}${clear}</div>`;
}
