import type { WidgetState } from "../types";
import { stars } from "../helpers";

export function renderSummary(state: WidgetState): string {
  const summary = state.summary;
  if (!summary) return "";
  const avg = summary.average.toFixed(1);
  return `
    <div class="rvos-summary">
      <div class="rvos-summary__score">${avg}</div>
      <div class="rvos-summary__meta">
        <div class="rvos-stars">${stars(Math.round(summary.average))}</div>
        <div class="rvos-summary__count">${summary.count} review${summary.count === 1 ? "" : "s"}</div>
      </div>
      <button type="button" class="rvos-btn rvos-btn--primary rvos-summary__write" data-action="open-write">
        Write a review
      </button>
    </div>
  `;
}
