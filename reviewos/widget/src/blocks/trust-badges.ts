import type { WidgetState } from "../types";
import { esc, stars } from "../helpers";

export function renderTrustBadges(state: WidgetState): string {
  const stats = state.marketplaceStats;
  if (!stats || stats.length === 0) return "";

  const cards = stats
    .map((stat) => {
      const initial = esc(stat.source.name.trim().charAt(0).toUpperCase() || "?");
      const logo = stat.source.logoUrl
        ? `<img class="rvos-trust-badge__logo" src="${esc(stat.source.logoUrl)}" alt="${esc(stat.source.name)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'rvos-trust-badge__fallback',textContent:'${initial}'}))" />`
        : `<div class="rvos-trust-badge__fallback">${initial}</div>`;

      return `
        <a class="rvos-trust-badge" href="${esc(stat.url)}" target="_blank" rel="noopener noreferrer">
          ${logo}
          <div class="rvos-trust-badge__body">
            <div class="rvos-trust-badge__name">${esc(stat.source.name)}</div>
            <div class="rvos-stars">${stars(Math.round(stat.rating))}</div>
            <div class="rvos-trust-badge__count">${esc(stat.rating.toFixed(1))} | ${stat.reviewCount.toLocaleString()} reviews</div>
          </div>
        </a>
      `;
    })
    .join("");

  return `
    <div class="rvos-trust-badges">
      <div class="rvos-trust-badges__row">${cards}</div>
      <div class="rvos-trust-badges__combined">Rated across ${stats.length} marketplace${stats.length === 1 ? "" : "s"}</div>
    </div>
  `;
}
