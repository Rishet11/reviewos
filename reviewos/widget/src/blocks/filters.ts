import type { WidgetState } from "../types";
import { esc } from "../helpers";

export function renderFilters(state: WidgetState): string {
  if (state.attributeDefs.length === 0) return "";

  const chips = state.attributeDefs
    .map((def) => {
      const activeValue = state.attrFilters[def.key];
      const options = def.options
        .map((opt) => {
          const active = activeValue === opt;
          return `<button type="button" class="rvos-chip ${active ? "rvos-chip--active" : ""}" data-action="toggle-filter" data-key="${esc(def.key)}" data-value="${esc(opt)}">${esc(opt)}</button>`;
        })
        .join("");
      return `
        <div class="rvos-filter-group">
          <span class="rvos-filter-group__label">${esc(def.label)}</span>
          <div class="rvos-filter-group__options">${options}</div>
        </div>
      `;
    })
    .join("");

  const activeEntries = Object.entries(state.attrFilters);
  const activeChips =
    activeEntries.length > 0
      ? `<div class="rvos-active-filters">
          ${activeEntries
            .map(([key, value]) => {
              const def = state.attributeDefs.find((d) => d.key === key);
              const label = def ? def.label : key;
              return `<span class="rvos-active-chip">${esc(label)}: ${esc(value)} <button type="button" data-action="toggle-filter" data-key="${esc(key)}" data-value="${esc(value)}" aria-label="Remove filter">&times;</button></span>`;
            })
            .join("")}
          <button type="button" class="rvos-link" data-action="clear-filters">Clear all</button>
        </div>`
      : "";

  return `<div class="rvos-filters">${activeChips}${chips}</div>`;
}
